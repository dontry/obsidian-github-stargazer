export type App = {
	vault?: unknown;
	workspace?: unknown;
	metadataCache?: unknown;
	loadData?: () => Promise<unknown>;
	saveData?: (data: unknown) => Promise<void>;
};

export class Notice {
  message: string;
  static messages: string[] = [];

  constructor(message: string) {
    this.message = message;
    Notice.messages.push(message);
  }
}

export type CommandDefinition = {
  id: string;
  name: string;
  callback: () => void;
};

export class Plugin {
	app: App;
	manifest: Record<string, unknown>;

  constructor(app: App = {}, manifest: Record<string, unknown> = {}) {
    this.app = app;
    this.manifest = manifest;
  }

  async onload(): Promise<void> {}
  onunload(): void {}

  addCommand(command: CommandDefinition): string {
    return command.id;
  }

  addSettingTab(_tab: PluginSettingTab): void {}

  addRibbonIcon(
    _icon: string,
    _title: string,
    _callback: (evt: MouseEvent) => void,
  ) {
    return { addClass: () => {} };
  }

  async loadData(): Promise<unknown> {
    return this.app.loadData ? this.app.loadData() : null;
  }

  async saveData(data: unknown): Promise<void> {
    if (this.app.saveData) {
      await this.app.saveData(data);
    }
  }

	registerEvent(): void {}
	registerDomEvent(): void {}
	registerInterval(id: number): number {
		return id;
	}
}

class MockElement {
	children: MockElement[] = [];
	text?: string;
	style: Record<string, string> = {};

	empty(): this {
		this.children = [];
		this.text = undefined;
		return this;
	}

	createEl(_tag: string, options?: { text?: string; cls?: string }) {
		const child = new MockElement();
		child.text = options?.text;
		this.children.push(child);
		return child;
	}

	createDiv(options?: { text?: string; cls?: string }) {
		return this.createEl('div', options);
	}

	addClass(_cls: string): this {
		return this;
	}

	setText(text: string): this {
		this.text = text;
		return this;
	}
}

export class Modal {
	app: App;
	titleEl: MockElement = new MockElement();
	contentEl: MockElement = new MockElement();
	isOpen = false;

	constructor(app: App) {
		this.app = app;
	}

	open(): void {
		this.isOpen = true;
		this.onOpen();
	}

	close(): void {
		this.isOpen = false;
		this.onClose();
	}

	onOpen(): void {}
	onClose(): void {}
}

export class PluginSettingTab {
	app: App;
	plugin: Plugin;
  containerEl: MockElement = new MockElement();

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
  }

  display(): void {}
}

class TextComponent {
  value = '';

  setPlaceholder(_value: string): this {
    return this;
  }

  setValue(value: string): this {
    this.value = value;
    return this;
  }

  onChange(_callback: (value: string) => void): this {
    return this;
  }
}

class ToggleComponent {
  value = false;

  setValue(value: boolean): this {
    this.value = value;
    return this;
  }

  onChange(_callback: (value: boolean) => void): this {
    return this;
  }
}

class ButtonComponent {
  setButtonText(_text: string): this {
    return this;
  }

  onClick(_callback: () => void): this {
    return this;
  }
}

export class Setting {
	containerEl: MockElement;

	constructor(containerEl: MockElement) {
		this.containerEl = containerEl;
	}

	setName(_name: string): this {
		return this;
	}

	setDesc(_desc: string): this {
		return this;
	}

	addText(callback: (component: TextComponent) => void): this {
		callback(new TextComponent());
		return this;
	}

	addToggle(callback: (component: ToggleComponent) => void): this {
		callback(new ToggleComponent());
		return this;
	}

	addButton(callback: (component: ButtonComponent) => void): this {
		callback(new ButtonComponent());
		return this;
	}
}

export class Platform {
	static isMobile: boolean = false;
	static isDesktop: boolean = true;
	static isAndroidApp: boolean = false;
	static isIosApp: boolean = false;
}
