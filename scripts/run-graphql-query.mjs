#!/usr/bin/env node
/**
 * Interactive runner for the queries defined in src/sync/graphql-queries.ts.
 *
 * Usage:
 *   node scripts/run-graphql-query.mjs --token ghp_xxxx
 *   GITHUB_TOKEN=ghp_xxxx node scripts/run-graphql-query.mjs
 *
 * Flags:
 *   --token <tok>       GitHub personal access token (needs `read:user` + public_repo)
 *   --query <name>      starred | repo-by-id | unstar   (skip the interactive prompt)
 *   --cursor <str>      pagination cursor for `starred`
 *   --page-size <n>     page size for `starred`          (default: 5)
 *   --repo-id <id>      GitHub node ID for `repo-by-id` or `unstar`
 *   --output <file>     write JSON result to a file instead of stdout
 */

import https from "https";
import readline from "readline";
import fs from "fs";

// ─── query strings (inlined so the script needs no build step) ───────────────

const GET_STARRED_REPOSITORIES_QUERY = `
  query GetStarredRepositories($cursor: String, $pageSize: Int!) {
    viewer {
      starredRepositories(
        first: $pageSize
        after: $cursor
        orderBy: {field: STARRED_AT, direction: DESC}
      ) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            ... on Repository {
              id name nameWithOwner description url stargazerCount
              primaryLanguage { name }
              repositoryTopics(first: 10) { nodes { topic { name } } }
              createdAt updatedAt pushedAt homepageUrl forkCount
              issues(states: OPEN) { totalCount }
              watchers { totalCount }
              licenseInfo { spdxId }
              owner { login url }
              readme: object(expression: "HEAD:README.md") {
                ... on Blob { oid }
              }
              defaultBranchRef { name }
            }
          }
          starredAt
        }
      }
    }
    rateLimit { cost remaining resetAt }
  }
`;

const GET_REPOSITORY_BY_ID_QUERY = `
  query GetRepositoryById($repositoryId: ID!) {
    node(id: $repositoryId) {
      ... on Repository {
        id name nameWithOwner description url stargazerCount
        primaryLanguage { name }
        createdAt updatedAt pushedAt
        owner { login url }
        readme: object(expression: "HEAD:README.md") {
          ... on Blob { oid text }
        }
        defaultBranchRef { name }
      }
    }
    rateLimit { cost remaining resetAt }
  }
`;

const UNSTAR_REPOSITORY_MUTATION = `
  mutation UnstarRepository($repositoryId: ID!) {
    removeStar(input: {starrableId: $repositoryId}) {
      clientMutationId
    }
  }
`;

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Parse --flag value pairs from process.argv */
function parseArgs(argv) {
	const args = {};
	for (let i = 2; i < argv.length; i++) {
		const key = argv[i];
		if (key.startsWith("--")) {
			const next = argv[i + 1];
			args[key.slice(2)] = next && !next.startsWith("--") ? (i++, next) : true;
		}
	}
	return args;
}

/** Post a GraphQL request to the GitHub API, return parsed JSON */
function graphqlRequest(token, query, variables) {
	return new Promise((resolve, reject) => {
		const body = JSON.stringify({ query, variables });
		const url = new URL(GITHUB_GRAPHQL_ENDPOINT);
		const options = {
			hostname: url.hostname,
			path: url.pathname,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(body),
				Authorization: `Bearer ${token}`,
				"User-Agent": "obsidian-github-stargazer/run-graphql-query.mjs",
				Accept: "application/vnd.github+json",
			},
		};

		const req = https.request(options, (res) => {
			let data = "";
			res.on("data", (chunk) => (data += chunk));
			res.on("end", () => {
				if (res.statusCode === 401) return reject(new Error("❌ Authentication failed — check your token."));
				if (res.statusCode === 403) return reject(new Error("❌ Rate limit exceeded (HTTP 403)."));
				if (res.statusCode !== 200)
					return reject(new Error(`❌ HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
				try {
					const parsed = JSON.parse(data);
					if (parsed.errors?.length) {
						const msgs = parsed.errors.map((e) => e.message).join("; ");
						return reject(new Error(`❌ GraphQL errors: ${msgs}`));
					}
					resolve(parsed);
				} catch (e) {
					reject(new Error(`❌ Failed to parse JSON response: ${e.message}`));
				}
			});
		});

		req.on("error", reject);
		req.write(body);
		req.end();
	});
}

/** Prompt the user for a string value */
function prompt(rl, question) {
	return new Promise((resolve) => rl.question(question, resolve));
}

/** Pretty-print rate-limit info if present */
function printRateLimit(result) {
	const rl = result.data?.rateLimit;
	if (rl) {
		console.log(
			`\n📊 Rate limit — cost: ${rl.cost}  remaining: ${rl.remaining}  resets: ${rl.resetAt}`
		);
	}
}

// ─── query runners ───────────────────────────────────────────────────────────

async function runStarred(token, args, rl) {
	const cursor =
		args.cursor ??
		(await prompt(rl, "  Cursor (leave blank for first page): "));
	const pageSizeRaw =
		args["page-size"] ??
		(await prompt(rl, "  Page size [5]: "));
	const pageSize = parseInt(pageSizeRaw || "5", 10);

	console.log(`\n⏳ Fetching starred repos (pageSize=${pageSize}, cursor=${cursor || "null"}) …\n`);
	const result = await graphqlRequest(token, GET_STARRED_REPOSITORIES_QUERY, {
		cursor: cursor || null,
		pageSize,
	});

	const starred = result.data?.viewer?.starredRepositories;
	if (starred) {
		const { hasNextPage, endCursor } = starred.pageInfo;
		console.log(`  📄 Page info → hasNextPage: ${hasNextPage}  endCursor: ${endCursor ?? "null"}`);
		console.log(`  📦 Edges returned: ${starred.edges.length}\n`);
		starred.edges.forEach(({ node, starredAt }, i) => {
			console.log(`  ${i + 1}. ${node.nameWithOwner}  ⭐ ${node.stargazerCount}  (starred ${starredAt})`);
			if (node.description) console.log(`     ${node.description}`);
		});
	}

	printRateLimit(result);
	return result;
}

async function runRepoById(token, args, rl) {
	const repoId =
		args["repo-id"] ??
		(await prompt(rl, "  Repository node ID (e.g. R_kgDO…): "));
	if (!repoId) throw new Error("--repo-id is required for this query.");

	console.log(`\n⏳ Fetching repo by ID: ${repoId} …\n`);
	const result = await graphqlRequest(token, GET_REPOSITORY_BY_ID_QUERY, {
		repositoryId: repoId,
	});

	const node = result.data?.node;
	if (node) {
		console.log(`  📦 ${node.nameWithOwner}  ⭐ ${node.stargazerCount}`);
		if (node.description) console.log(`     ${node.description}`);
		console.log(`     Language: ${node.primaryLanguage?.name ?? "N/A"}`);
		console.log(`     Branch  : ${node.defaultBranchRef?.name ?? "N/A"}`);
		console.log(`     Readme  : ${node.readme ? `oid=${node.readme.oid}` : "none"}`);
	} else {
		console.log("  ⚠️  node was null — repository not found or no access.");
	}

	printRateLimit(result);
	return result;
}

async function runUnstar(token, args, rl) {
	const repoId =
		args["repo-id"] ??
		(await prompt(rl, "  Repository node ID to unstar (e.g. R_kgDO…): "));
	if (!repoId) throw new Error("--repo-id is required for this mutation.");

	const confirm = await prompt(
		rl,
		`  ⚠️  This will UNSTAR ${repoId}. Type "yes" to confirm: `
	);
	if (confirm.trim().toLowerCase() !== "yes") {
		console.log("  Aborted.");
		process.exit(0);
	}

	console.log(`\n⏳ Unstarring ${repoId} …\n`);
	const result = await graphqlRequest(token, UNSTAR_REPOSITORY_MUTATION, {
		repositoryId: repoId,
	});

	console.log(
		`  ✅ Done — clientMutationId: ${result.data?.removeStar?.clientMutationId ?? "null"}`
	);
	return result;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
	const args = parseArgs(process.argv);

	// ── resolve token ──
	const token = args.token ?? process.env.GITHUB_TOKEN;
	if (!token) {
		console.error(
			"❌ No GitHub token found.\n" +
			"   Pass one with --token ghp_xxxx  or set GITHUB_TOKEN in your environment."
		);
		process.exit(1);
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	// ── choose query ──
	let queryName = args.query;
	if (!queryName) {
		console.log("\n🔍 GitHub GraphQL Query Runner\n");
		console.log("  1. starred       — GetStarredRepositories (paginated)");
		console.log("  2. repo-by-id    — GetRepositoryById");
		console.log("  3. unstar        — UnstarRepository (mutation)\n");
		const choice = await prompt(rl, "  Choose [1/2/3 or name]: ");
		const map = { "1": "starred", "2": "repo-by-id", "3": "unstar" };
		queryName = map[choice.trim()] ?? choice.trim();
	}

	let result;
	try {
		switch (queryName) {
			case "starred":
				result = await runStarred(token, args, rl);
				break;
			case "repo-by-id":
				result = await runRepoById(token, args, rl);
				break;
			case "unstar":
				result = await runUnstar(token, args, rl);
				break;
			default:
				console.error(`❌ Unknown query "${queryName}". Use: starred | repo-by-id | unstar`);
				rl.close();
				process.exit(1);
		}
	} catch (err) {
		console.error(`\n${err.message}`);
		rl.close();
		process.exit(1);
	}

	// ── optional file output ──
	if (args.output) {
		const outPath = args.output;
		fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
		console.log(`\n💾 Full response written to: ${outPath}`);
	} else {
		console.log("\n--- Full JSON response ---");
		console.log(JSON.stringify(result, null, 2));
	}

	rl.close();
}

main();
