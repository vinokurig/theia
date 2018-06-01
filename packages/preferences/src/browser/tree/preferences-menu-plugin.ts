/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import {inject, injectable} from "inversify";
import { BrowserMainMenuFactory, DynamicMenuWidget } from "@theia/core/lib/browser/menu/browser-menu-plugin";
import { Menu as MenuWidget } from "@phosphor/widgets";
import { ActionMenuNode, CompositeMenuNode } from "@theia/core";
import { CommandRegistry } from "@theia/core/lib/common/command";
import { PreferenceProperty } from "@theia/core/lib/browser";

@injectable()
export class PreferencesBrowserMainMenuFactory extends BrowserMainMenuFactory {
    @inject(CommandRegistry) protected readonly commands: CommandRegistry;
    createContextMenu1(id: string, property: PreferenceProperty | undefined, execute: (property: string, value: any) => void): MenuWidget {
        const menuModel: CompositeMenuNode = new CompositeMenuNode('id', 'contextMenu');
        if (property) {
            const enumConst = property.enum;
            if (enumConst) {
                enumConst.forEach(enumValue => {
                    if (! this.commands.getCommand(id + '-' + enumValue)) {
                        this.commands.registerCommand({id: id + '-' + enumValue, label: enumValue}, {
                            execute: () => execute(id, enumValue)
                        });
                    }
                    menuModel.addNode(new ActionMenuNode({commandId: id + '-' + enumValue}, this.commands));
                });
            } else if (property.type && property.type === 'boolean') {
                this.commands.registerCommand({id: 'trueProperty', label: 'true'}, {
                    execute: () => execute(id, 'true')
                });
                this.commands.registerCommand({id: 'falseProperty', label: 'false'}, {
                    execute: () => execute(id, 'false')
                });
                menuModel.addNode(new ActionMenuNode({commandId: 'trueProperty'}, this.commands));
                menuModel.addNode(new ActionMenuNode({commandId: 'falseProperty'}, this.commands));
            } else {
                this.commands.registerCommand({id: 'stringProperty', label: 'Add Value'}, {
                    execute: () => execute(id, property.default)
                });
                menuModel.addNode(new ActionMenuNode({commandId: 'stringProperty'}, this.commands));
            }
        }
        const phosphorCommands = this.createPhosporCommands(menuModel);

        return new DynamicMenuWidget(menuModel, { commands: phosphorCommands });
    }
}
