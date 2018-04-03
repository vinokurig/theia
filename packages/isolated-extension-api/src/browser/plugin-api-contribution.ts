/*
 * Copyright (C) 2015-2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { injectable, inject } from 'inversify';
import { Command, CommandRegistry, CommandContribution, MessageService } from '@theia/core/lib/common';
import { KeybindingRegistry, KeybindingContribution } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { HostedExtensionServer } from '../common/extension-protocol';

export const runTheiaHostedPlugin: Command = {
    id: 'runTheiaHostedPlugin',
    label: 'Run Hosted Plugin'
};

@injectable()
export class PluginApiFrontendContribution implements CommandContribution, KeybindingContribution {

    @inject(HostedExtensionServer)
    protected readonly hostedExtensionServer: HostedExtensionServer;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(runTheiaHostedPlugin, {
            execute: () => this.runHostedPluginHandler()
        });
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            command: runTheiaHostedPlugin.id,
            keybinding: "f7"
        });
    }

    protected runHostedPluginHandler(): void {
        const uri = this.getPluginUri();
        this.hostedExtensionServer.isValidPlugin(uri.toString()).then(() => {
            this.hostedExtensionServer.runHostedPlugin(uri.toString()).then(location => {
                console.log(location!.toString());
                this.messageService.info('Hosted instancse is running at: ' + location.toString());
            }).catch(error => {
                this.messageService.error('Failed to run hosted plugin instanse: ' + error);
            });
        }).catch(error => {
            this.messageService.error('No valid plugin in the speified path found.');
        });
    }

    protected getPluginUri(): URI {
        // TODO it is temporary solution
        return new URI('file:///tmp/simple-plugin-1');
    }

}
