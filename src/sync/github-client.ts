import { GITHUB_GRAPHQL_API_URL } from '@/utils/constants';

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
	async fetchStarredRepositories(cursor: string | null, pageSize: number): Promise<any> {
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

		const response = await fetch(GITHUB_GRAPHQL_API_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query,
				variables: { cursor, pageSize },
			}),
		});

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error('Authentication failed. Please check your GitHub token.');
			}
			if (response.status === 403) {
				throw new Error('Rate limit exceeded. Please wait before syncing again.');
			}
			throw new Error(`GitHub API request failed: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.errors) {
			throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
		}

		return data.data;
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

		const response = await fetch(GITHUB_GRAPHQL_API_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query: mutation,
				variables: { repositoryId },
			}),
		});

		if (!response.ok) {
			throw new Error(`Failed to unstar repository: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.errors) {
			throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
		}
	}
}
