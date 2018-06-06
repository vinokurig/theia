/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable } from "inversify";
import { BrowserMainMenuFactory, DynamicMenuWidget } from "@theia/core/lib/browser/menu/browser-menu-plugin";
import { Menu as MenuWidget} from "@phosphor/widgets";
import { ActionMenuNode, Command, CompositeMenuNode } from "@theia/core";
import { CommandRegistry } from "@theia/core";
import { PreferenceProperty } from "@theia/core/lib/browser";

@injectable()
export class PreferencesBrowserMainMenuFactory extends BrowserMainMenuFactory {

    private commandsStorage: Command[] = [];
    @inject(CommandRegistry) protected readonly commands: CommandRegistry;

    createPreferenceContextMenu(id: string, property: PreferenceProperty, execute: (property: string, value: any) => void): MenuWidget {
        const menuModel: CompositeMenuNode = new CompositeMenuNode('id', 'contextMenu');
        if (property) {
            const enumConst = property.enum;
            if (enumConst) {
                enumConst.forEach(enumValue => {
                    if (!this.commands.getCommand(id + '-' + enumValue)) {
                        const command: Command = {id: id + '-' + enumValue, label: enumValue};
                        this.commandsStorage.push(command);
                        this.commands.registerCommand(command, {
                            execute: () => execute(id, enumValue)
                        });
                    }
                    menuModel.addNode(new ActionMenuNode({commandId: id + '-' + enumValue}, this.commands));
                });
            } else if (property.type && property.type === 'boolean') {
                const commandTrue: Command = {id: 'trueProperty', label: 'true'};
                const commandFalse: Command = {id: 'falseProperty', label: 'false'};
                this.commands.registerCommand(commandTrue, {
                    execute: () => execute(id, 'true')
                });
                this.commands.registerCommand(commandFalse, {
                    execute: () => execute(id, 'false')
                });
                this.commandsStorage.push(commandTrue, commandFalse);
                menuModel.addNode(new ActionMenuNode({commandId: 'trueProperty'}, this.commands));
                menuModel.addNode(new ActionMenuNode({commandId: 'falseProperty'}, this.commands));
            } else {
                const command: Command = {id: 'stringProperty', label: 'Add Value'};
                this.commandsStorage.push(command);
                this.commands.registerCommand(command, {
                    execute: () => execute(id, property.default ? property.default : '')
                });
                menuModel.addNode(new ActionMenuNode({commandId: 'stringProperty'}, this.commands));
            }
        }
        const phosphorCommands = this.createPhosporCommands(menuModel);

        const menu = new DynamicMenuWidget(menuModel, {commands: phosphorCommands});
        menu.aboutToClose.connect(() => {
            this.commandsStorage.forEach(command => {
                this.commands.unregisterCommand(command.id);
                this.commands.unregisterHandler(command.id);
            });
            this.commandsStorage = [];
        });
        return menu;
    }
}
