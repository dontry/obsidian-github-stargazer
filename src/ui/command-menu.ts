import { App, FuzzyMatch, FuzzySuggestModal, setIcon } from "obsidian";

export interface CommandMenuItem {
	id: string;
	name: string;
	icon?: string;
	action: () => void;
}

export class CommandMenuModal extends FuzzySuggestModal<CommandMenuItem> {
	private items: CommandMenuItem[];

	constructor(app: App, items: CommandMenuItem[]) {
		super(app);
		this.items = items;
		this.setPlaceholder("Select a command...");
	}

	getItems(): CommandMenuItem[] {
		return this.items;
	}

	getItemText(item: CommandMenuItem): string {
		return item.name;
	}

	onChooseItem(item: CommandMenuItem): void {
		item.action();
	}

	renderSuggestion(match: FuzzyMatch<CommandMenuItem>, el: HTMLElement): void {
		const item = match.item;
		el.addClass("ghs-command-menu__item");

		const content = el.createDiv({ cls: "ghs-command-menu__content" });
		if (item.icon) {
			const icon = content.createSpan({ cls: "ghs-command-menu__icon" });
			setIcon(icon, item.icon);
		}

		content.createSpan({ cls: "ghs-command-menu__title", text: item.name });
	}
}
