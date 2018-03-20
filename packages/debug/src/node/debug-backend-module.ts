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

import { ConnectionHandler, JsonRpcConnectionHandler, bindContributionProvider } from "@theia/core/lib/common";
import { ContainerModule, interfaces } from 'inversify';
import {
    DebugServiceImpl,
    DebugSessionManager,
    DebugAdapterContributionRegistry
} from "./debug-service";
import {
    DebugPath,
    DebugService,
    DebugAdapterContribution,
    DebugAdapterFactory,
    DebugAdapterExecutable
} from "../common/debug-model";
import { DebugAdapterSession, LauncherBasedDebugAdapterFactory, ServerContainer } from "./debug-session";
import { BackendApplicationContribution } from "@theia/core/lib/node";

export default new ContainerModule(bind => {
    bind(DebugAdapterContributionRegistry).toSelf().inSingletonScope();
    bind(DebugSessionManager).toSelf().inSingletonScope();
    bind(DebugService).to(DebugServiceImpl).inSingletonScope();
    bind(DebugAdapterFactory).to(LauncherBasedDebugAdapterFactory).inSingletonScope();
    bind(BackendApplicationContribution).to(ServerContainer).inSingletonScope();
    bindContributionProvider(bind, DebugAdapterContribution);

    bind(ConnectionHandler).toDynamicValue(context =>
        new JsonRpcConnectionHandler(DebugPath, client => {
            const service = context.container.get<DebugService>(DebugService);
            client.onDidCloseConnection(() => service.dispose());
            return service;
        })
    ).inSingletonScope();

    bind<interfaces.Factory<DebugAdapterSession>>("Factory<DebugAdapterSession>").toFactory<DebugAdapterSession>(context => {
        return (sessionId: string, executable: DebugAdapterExecutable) => {
            let session = context.container.get(DebugAdapterSession);
            session.assistedInit(sessionId, executable);
            return session;
        };
    });
});
