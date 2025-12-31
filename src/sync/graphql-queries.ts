/**
 * GraphQL query definitions for GitHub API
 *
 * These queries are used by the GitHubGraphQLClient to fetch data from
 * GitHub's GraphQL API.
 */

/**
 * GraphQL query for fetching starred repositories
 *
 * This query uses pagination to efficiently fetch all starred repositories.
 * The `after` cursor allows fetching subsequent pages of results.
 */
export const GET_STARRED_REPOSITORIES_QUERY = `
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

/**
 * GraphQL mutation for unstarring a repository
 *
 * This mutation removes a star from a repository using its GitHub node ID.
 */
export const UNSTAR_REPOSITORY_MUTATION = `
	mutation UnstarRepository($repositoryId: ID!) {
		removeStar(input: {starrableId: $repositoryId}) {
			clientMutationId
		}
	}
`;

/**
 * GraphQL query for fetching a single repository by ID
 *
 * This query fetches detailed information about a specific repository
 * using its GitHub node ID.
 */
export const GET_REPOSITORY_BY_ID_QUERY = `
	query GetRepositoryById($repositoryId: ID!) {
		node(id: $repositoryId) {
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
	}
`;

/**
 * Query variables types
 */

export interface GetStarredRepositoriesVariables {
	cursor: string | null;
	pageSize: number;
}

export interface UnstarRepositoryVariables {
	repositoryId: string;
}

export interface GetRepositoryByIdVariables {
	repositoryId: string;
}
