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
import { injectable } from "inversify";
import * as cp from "child_process";
import * as net from "net";
import { hostname } from "os";
import URI from '@theia/core/lib/common/uri';

@injectable()
export class HostedPluginRunner {
    protected process: cp.ChildProcess;
    protected uri: URI;
    protected port: number;
    protected isPluginRunnig: boolean = false;

    isRunning() {
        return this.isPluginRunnig;
    }

    /**
     * Runs specified by the given uri plugin in separate Theia instance.
     *
     * @param uri uri to the plugin
     * @param port port on which new instance of Theia should be run.
     *             If not specified value from settings will be used.
     * @returns location of Theia instance with hosted plugin
     */
    async run(uri: URI, port?: number): Promise<URI> {
        this.port = await this.getValidPort(port);

        if (uri.scheme === 'file') {
            this.runHostedPluginTheiaInstance(uri, this.port);
            return this.getInstanceURI();
        }
        throw new Error('Not supported plugin location: ' + uri.toString());
    }

    terminate(): void {
        if (this.isRunning) {
            this.process.kill();
        } else {
            throw new Error('Hosted plugin instance is not running.');
        }
    }

    getInstanceURI(): URI {
        if (this.isPluginRunnig) {
            return new URI(hostname() + ':' + this.port);
        } else {
            throw new Error('Hosted plugin instance is not running.');
        }
    }

    isValidPlugin(uri: URI): boolean {
        const packageJson = require(uri.path.toString() + '/package.json');
        const extensions = packageJson['theiaExtension'];
        if (extensions && (extensions['worker'] || extensions['node'])) {
            return true;
        }
        return false;
    }

    protected runHostedPluginTheiaInstance(uri: URI, port: number): void {
        const options: cp.SpawnOptions = {
            cwd: __dirname,
            env: {
                HOSTED_PLUGIN: uri.path.toString()
            }
        };

        this.isPluginRunnig = true;
        this.process = cp.spawn('yarn', ['run', 'start', '--hostname=0.0.0.0', '--port=' + port], options);
        this.process.on('error', () => { this.isPluginRunnig = false; });
        this.process.on('exit', () => { this.isPluginRunnig = false; });
    }

    protected async getValidPort(suggestedPort: number | undefined): Promise<number> {
        if (!suggestedPort) {
            return 3030; // TODO settings
        }

        if (suggestedPort < 1 || suggestedPort > 65535) {
            throw new Error('Port value is incorrect.');
        }

        if (await this.isPortFree(suggestedPort)) {
            return suggestedPort;
        }
        throw new Error('Port ' + suggestedPort + ' is already in use.');
    }

    /**
     * Checks whether given port is free.
     *
     * @param port port to check
     */
    protected isPortFree(port: number): Promise<boolean> {
        return new Promise(resolve => {
            const server = net.createServer();
            server.listen(port, '0.0.0.0');
            server.on('error', () => {
                resolve(false);
            });
            server.on('listening', () => {
                server.close();
                resolve(true);
            });
        });
    }

}
