/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as electron from 'electron';
import { inject, injectable } from 'inversify';
import {
    CommandRegistry, isOSX, ActionMenuNode, CompositeMenuNode,
    MAIN_MENU_BAR, MenuModelRegistry, MenuPath
} from '../../common';
import { PreferenceService, KeybindingRegistry, Keybinding, KeyCode, Key } from '../../browser';

@injectable()
export class ElectronMainMenuFactory {

    constructor(
        @inject(CommandRegistry) protected readonly commandRegistry: CommandRegistry,
        @inject(PreferenceService) protected readonly preferencesService: PreferenceService,
        @inject(MenuModelRegistry) protected readonly menuProvider: MenuModelRegistry,
        @inject(KeybindingRegistry) protected readonly keybindingRegistry: KeybindingRegistry
    ) { }

    createMenuBar(): Electron.Menu {
        const menuModel = this.menuProvider.getMenu(MAIN_MENU_BAR);
        const template = this.fillMenuTemplate([], menuModel);
        if (isOSX) {
            template.unshift(this.createOSXMenu());
        }
        return electron.remote.Menu.buildFromTemplate(template);
    }

    createContextMenu(menuPath: MenuPath): Electron.Menu {
        const menuModel = this.menuProvider.getMenu(menuPath);
        const template = this.fillMenuTemplate([], menuModel);

        return electron.remote.Menu.buildFromTemplate(template);
    }

    protected fillMenuTemplate(items: Electron.MenuItemConstructorOptions[], menuModel: CompositeMenuNode): Electron.MenuItemConstructorOptions[] {
        const toggledCommands: string[] = [];
        for (const menu of menuModel.children) {
            if (menu instanceof CompositeMenuNode) {
                if (menu.label) {
                    // should we create a submenu?
                    items.push({
                        label: menu.label,
                        submenu: this.fillMenuTemplate([], menu)
                    });
                } else {
                    // or just a separator?
                    items.push({
                        type: 'separator'
                    });
                    // followed by the elements
                    this.fillMenuTemplate(items, menu);
                }
            } else if (menu instanceof ActionMenuNode) {
                const commandId = menu.action.commandId;
                // That is only a sanity check at application startup.
                if (!this.commandRegistry.getCommand(commandId)) {
                    throw new Error(`Unknown command with ID: ${commandId}.`);
                }

                const bindings = this.keybindingRegistry.getKeybindingsForCommand(commandId);

                let accelerator;

                /* Only consider the first keybinding. */
                if (bindings.length > 0) {
                    const binding = bindings[0];
                    accelerator = this.acceleratorFor(binding);
                }

                items.push({
                    id: menu.id,
                    label: menu.label,
                    icon: menu.icon,
                    type: this.commandRegistry.getToggledHandler(commandId) ? "checkbox" : "normal",
                    checked: this.commandRegistry.isToggled(commandId),
                    enabled: true, // https://github.com/theia-ide/theia/issues/446
                    visible: true,
                    click: () => this.execute(commandId),
                    accelerator
                });
                if (this.commandRegistry.getToggledHandler(commandId)) {
                    toggledCommands.push(commandId);
                }
            }
        }
        this.preferencesService.onPreferenceChanged(() => {
            const applicationMenu = electron.remote.Menu.getApplicationMenu();
            if (applicationMenu) {
                for (const item of toggledCommands) {
                    applicationMenu.getMenuItemById(item).checked = this.commandRegistry.isToggled(item);
                    electron.remote.Menu.setApplicationMenu(applicationMenu);
                }
            }
        });
        return items;
    }

    /* Return a user visble representation of a keybinding.  */
    protected acceleratorFor(keybinding: Keybinding) {
        const keyCodesString = keybinding.keybinding.split(" ");
        let result = "";
        /* FIXME see https://github.com/electron/electron/issues/11740
           Key Sequences can't be represented properly in the electron menu. */
        if (keyCodesString.length > 1) {
            return result;
        }

        const keyCodeString = keyCodesString[0];
        const keyCode = KeyCode.parse(keyCodeString);
        let previous = false;
        const separator = "+";

        if (keyCode.meta && isOSX) {
            if (isOSX) {
                result += "Cmd";
                previous = true;
            }
        }

        if (keyCode.ctrl) {
            if (previous) {
                result += separator;
            }
            result += "Ctrl";
            previous = true;
        }

        if (keyCode.alt) {
            if (previous) {
                result += separator;
            }
            result += "Alt";
            previous = true;
        }

        if (keyCode.shift) {
            if (previous) {
                result += separator;
            }
            result += "Shift";
            previous = true;
        }

        if (keyCode.key) {
            if (previous) {
                result += separator;
            }

            result += Key.getEasyKey(keyCode.key).easyString;
        }

        return result;
    }

    protected execute(command: string): void {
        this.commandRegistry.executeCommand(command).catch(() => { /* no-op */ });
        if (this.commandRegistry.getToggledHandler(command)) {
            const menu = electron.remote.Menu;
            menu.setApplicationMenu(menu.getApplicationMenu());
        }
    }

    protected createOSXMenu(): Electron.MenuItemConstructorOptions {
        return {
            label: 'Theia',
            submenu: [
                {
                    role: 'about'
                },
                {
                    type: 'separator'
                },
                {
                    role: 'services',
                    submenu: []
                },
                {
                    type: 'separator'
                },
                {
                    role: 'hide'
                },
                {
                    role: 'hideothers'
                },
                {
                    role: 'unhide'
                },
                {
                    type: 'separator'
                },
                {
                    role: 'quit'
                }
            ]
        };
    }

}
