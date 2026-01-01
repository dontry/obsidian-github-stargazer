import { requestUrl } from "obsidian";
import type {
	GetStarredRepositoriesResponse,
	GitHubGraphQLResult,
	UnstarRepositoryResponse,
} from "@/sync/graphql-queries";
import { GITHUB_GRAPHQL_API_URL } from "@/utils/constants";

/**
 * GitHub GraphQL API client
 * Handles authentication and API requests
 */
export class GitHubGraphQLClient {
	private token: string;

	constructor(token: string) {
		this.token = token;
	}

	/**
	 * Fetch starred repositories from GitHub
	 */
	async fetchStarredRepositories(
		cursor: string | null,
		pageSize: number,
	): Promise<GitHubGraphQLResult<GetStarredRepositoriesResponse>> {
		const query = `
			query GetStarredRepositories($cursor: String, $pageSize: Int!) {
				viewer {
					starredRepositories(
						first: $pageSize
						after: $cursor
						orderBy: {field: STARRED_AT, direction: DESC}
					) {
						pageInfo {
							hasNextPage
							endCursor
						}
						edges {
							node {
								... on Repository {
									id
									name
									nameWithOwner
									description
									url
									stargazerCount
									primaryLanguage {
										name
									}
									createdAt
									updatedAt
									pushedAt
									owner {
										login
										url
									}
									readme: object(expression: "HEAD:README.md") {
										... on Blob {
											text
										}
									}
									defaultBranchRef {
										name
									}
								}
							}
							starredAt
						}
					}
				}
			}
		`;

		const response = await requestUrl({
			url: GITHUB_GRAPHQL_API_URL,
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query,
				variables: { cursor, pageSize },
			}),
		});

		if (response.status !== 200 && response.status !== 201) {
			if (response.status === 401) {
				throw new Error(
					"Authentication failed. Please check your GitHub token.",
				);
			}
			if (response.status === 403) {
				throw new Error(
					"Rate limit exceeded. Please wait before syncing again.",
				);
			}
			throw new Error(`GitHub API request failed: ${response.status} ${response.text}`);
		}

		const data =
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			(await response.json()) as GitHubGraphQLResult<GetStarredRepositoriesResponse>;

		if (data.errors?.length) {
			throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
		}

		return data;
	}

	/**
	 * Unstar a repository
	 */
	async unstarRepository(repositoryId: string): Promise<void> {
		const mutation = `
			mutation UnstarRepository($repositoryId: ID!) {
				removeStar(input: {starrableId: $repositoryId}) {
					clientMutationId
				}
			}
		`;

		const response = await requestUrl({
			url: GITHUB_GRAPHQL_API_URL,
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query: mutation,
				variables: { repositoryId },
			}),
		});

		if (response.status !== 200) {
			throw new Error(`Failed to unstar repository: ${response.status}`);
		}

		if (typeof response.json === 'function') {
			const data =
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				(await response.json()) as GitHubGraphQLResult<UnstarRepositoryResponse>;

			if (data.errors?.length) {
				throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
			}
		}
	}
}
