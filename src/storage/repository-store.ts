import type { App } from "obsidian";
import type { Repository, RepositoryData } from "@/types";

/**
 * Storage layer for repository data
 *
 * Manages loading, saving, and querying repository data using Obsidian's
 * data storage API.
 */
export class RepositoryStore {
	private readonly DATA_FILE = "github-starred-repos.json";
	private app: App;
	private cache: Repository[] | null = null;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Load all repositories from storage
	 */
	async loadRepositories(): Promise<RepositoryData> {
		try {
			const data = await this.app.vault.adapter.read(this.DATA_FILE);

			if (!data) {
				// Return empty structure if file doesn't exist
				return {
					lastSync: null,
					repositories: [],
				};
			}

			const parsed = JSON.parse(data) as RepositoryData;
			this.cache = parsed.repositories;
			return parsed;
		} catch {
			// File doesn't exist or is invalid
			return {
				lastSync: null,
				repositories: [],
			};
		}
	}

	/**
	 * Save repositories to storage
	 */
	async saveRepositories(data: RepositoryData): Promise<void> {
		const content = JSON.stringify(data, null, 2);
		await this.app.vault.adapter.write(this.DATA_FILE, content);
		this.cache = data.repositories;
	}

	/**
	 * Get a single repository by its GitHub ID
	 */
	async getRepositoryById(id: string): Promise<Repository | null> {
		// Use cache if available
		if (this.cache) {
			return this.cache.find((repo) => repo.id === id) || null;
		}

		// Otherwise load from storage
		const data = await this.loadRepositories();
		return data.repositories.find((repo) => repo.id === id) || null;
	}

	/**
	 * Update a single repository
	 */
	async updateRepository(repository: Repository): Promise<void> {
		const data = await this.loadRepositories();
		const index = data.repositories.findIndex(
			(repo) => repo.id === repository.id,
		);

		if (index !== -1) {
			data.repositories[index] = repository;
			await this.saveRepositories(data);
		}
	}

	/**
	 * Add multiple repositories
	 */
	async addRepositories(repositories: Repository[]): Promise<void> {
		const data = await this.loadRepositories();

		// Merge repositories, updating existing ones
		const repoMap = new Map<string, Repository>();

		// Add existing repositories
		data.repositories.forEach((repo) => {
			repoMap.set(repo.id, repo);
		});

		// Add/update new repositories
		repositories.forEach((repo) => {
			repoMap.set(repo.id, repo);
		});

		// Convert back to array
		data.repositories = Array.from(repoMap.values());
		await this.saveRepositories(data);
	}

	/**
	 * Delete repositories by their IDs (complete removal from store)
	 */
	async deleteRepositories(repositoryIds: string[]): Promise<void> {
		const data = await this.loadRepositories();
		data.repositories = data.repositories.filter(
			(repo) => !repositoryIds.includes(repo.id),
		);
		await this.saveRepositories(data);
	}

	/**
	 * Clear the internal cache
	 */
	clearCache(): void {
		this.cache = null;
	}
}
