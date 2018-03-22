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
import { injectable, inject, interfaces } from 'inversify';
import { HostedExtensionServer, Extension } from '../common/extension-protocol';
import { ExtensionWorker } from './extension-worker';
import { setUpExtensionApi } from './main-context';
import { MAIN_RPC_CONTEXT } from '../api/extension-api';

@injectable()
export class HostedExtensionSupport {
    private worker: ExtensionWorker;

    constructor( @inject(HostedExtensionServer) private readonly server: HostedExtensionServer) {
    }

    checkAndLoadExtension(container: interfaces.Container): void {
        this.server.getHostedExtension().then(extension => {
            if (extension) {
                this.loadExtension(extension, container);
            }
        });
    }

    private loadExtension(extension: Extension, container: interfaces.Container): void {
        if (extension.theiaExtension!.worker) {
            console.log(`Loading hosted plugin: ${extension.name}`);
            this.worker = new ExtensionWorker();
            setUpExtensionApi(this.worker.rpc, container);
            const hostedExtManager = this.worker.rpc.getProxy(MAIN_RPC_CONTEXT.HOSTED_EXTENSION_MANAGER_EXT);
            hostedExtManager.loadExtension({
                extPath: extension.theiaExtension.worker!,
                name: extension.name,
                publisher: extension.publisher,
                version: extension.version
            });
        }
    }
}
