/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import { injectable, inject, interfaces } from 'inversify';
import { PluginWorker } from '../../main/browser/plugin-worker';
import { HostedPluginServer, PluginMetadata } from '../../common/plugin-protocol';
import { HostedPluginWatcher } from './hosted-plugin-watcher';
import { MAIN_RPC_CONTEXT } from '../../api/plugin-api';
import { setUpPluginApi } from '../../main/browser/main-context';
import { RPCProtocol, RPCProtocolImpl } from '../../api/rpc-protocol';
import { ILogger } from '@theia/core';
import { PreferenceServiceImpl } from '@theia/core/lib/browser';
import { PluginContributionHandler } from '../../main/browser/plugin-contribution-handler';

@injectable()
export class HostedPluginSupport {
    container: interfaces.Container;
    private worker: PluginWorker;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(HostedPluginServer)
    private readonly server: HostedPluginServer;

    @inject(HostedPluginWatcher)
    private readonly watcher: HostedPluginWatcher;

    @inject(PluginContributionHandler)
    private readonly contributionHandler: PluginContributionHandler;

    private theiaReadyPromise: Promise<any>;

    constructor(
        @inject(PreferenceServiceImpl) private readonly preferenceServiceImpl: PreferenceServiceImpl
    ) {
        this.theiaReadyPromise = Promise.all([this.preferenceServiceImpl.ready]);
    }

    checkAndLoadPlugin(container: interfaces.Container): void {
        this.container = container;
        this.initPlugins();
    }

    public initPlugins(): void {
        const backendMetadata = this.server.getDeployedBackendMetadata();
        const frontendMetadata = this.server.getDeployedFrontendMetadata();
        Promise.all([backendMetadata, frontendMetadata, this.server.getHostedPlugin()]).then(metadata => {
            const plugins = [...metadata['0'], ...metadata['1']];
            if (metadata['2']) {
                plugins.push(metadata['2']!);
            }
            this.loadPlugins(plugins, this.container);
        });

    }

    loadPlugins(pluginsMetadata: PluginMetadata[], container: interfaces.Container): void {
        const [frontend, backend] = this.initContributions(pluginsMetadata);
        this.theiaReadyPromise.then(() => {
            if (frontend) {
                this.worker = new PluginWorker();
                const hostedExtManager = this.worker.rpc.getProxy(MAIN_RPC_CONTEXT.HOSTED_PLUGIN_MANAGER_EXT);
                hostedExtManager.$init({ plugins: pluginsMetadata });
                setUpPluginApi(this.worker.rpc, container);
            }

            if (backend) {
                const rpc = this.createServerRpc();
                const hostedExtManager = rpc.getProxy(MAIN_RPC_CONTEXT.HOSTED_PLUGIN_MANAGER_EXT);
                hostedExtManager.$init({ plugins: pluginsMetadata });
                setUpPluginApi(rpc, container);
            }
        });

    }

    private initContributions(pluginsMetadata: PluginMetadata[]): [boolean, boolean] {
        const result: [boolean, boolean] = [false, false];
        for (const plugin of pluginsMetadata) {
            if (plugin.model.entryPoint.frontend) {
                result[0] = true;
            }

            if (plugin.model.entryPoint.backend) {
                result[1] = true;
            }

            if (plugin.model.contributes) {
                this.contributionHandler.handleContributions(plugin.model.contributes);
            }
        }

        return result;
    }

    private createServerRpc(): RPCProtocol {
        return new RPCProtocolImpl({
            onMessage: this.watcher.onPostMessageEvent,
            send: message => { this.server.onMessage(JSON.stringify(message)); }
        });
    }
}
