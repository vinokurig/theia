/*
 * Copyright (C) 2018 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
import { ContainerModule } from "inversify";
import { FrontendApplicationContribution, FrontendApplication, KeybindingContribution } from "@theia/core/lib/browser";
import { MaybePromise, CommandContribution } from "@theia/core/lib/common";
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';
import { ExtensionWorker } from './extension-worker';
import { HostedExtensionServer, hostedServicePath } from '../common/extension-protocol';
import { HostedExtensionSupport } from './hosted-extension';
import { setUpExtensionApi } from './main-context';
import { HostedExtensionWatcher } from './hosted-extension-watcher';
import { PluginApiFrontendContribution } from './plugin-api-contribution';

export default new ContainerModule(bind => {
    bind(ExtensionWorker).toSelf().inSingletonScope();
    bind(HostedExtensionSupport).toSelf().inSingletonScope();
    bind(HostedExtensionWatcher).toSelf().inSingletonScope();

    bind(PluginApiFrontendContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toDynamicValue(c => c.container.get(PluginApiFrontendContribution));
    bind(CommandContribution).toDynamicValue(c => c.container.get(PluginApiFrontendContribution));
    bind(KeybindingContribution).toDynamicValue(c => c.container.get(PluginApiFrontendContribution));

    bind(FrontendApplicationContribution).toDynamicValue(ctx => ({
        onStart(app: FrontendApplication): MaybePromise<void> {
            const worker = ctx.container.get(ExtensionWorker);

            setUpExtensionApi(worker.rpc, ctx.container);
            ctx.container.get(HostedExtensionSupport).checkAndLoadExtension(ctx.container);
        }
    }));
    bind(HostedExtensionServer).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        const hostedWatcher = ctx.container.get(HostedExtensionWatcher);
        return connection.createProxy<HostedExtensionServer>(hostedServicePath, hostedWatcher.getHostedExtensionClient());
    });
});
