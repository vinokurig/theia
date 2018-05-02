/*
 * Copyright (C) 2017 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
import { Container } from 'inversify';
import { loggerBackendModule } from '@theia/core/lib/node/logger-backend-module';
import { backendApplicationModule } from '@theia/core/lib/node/backend-application-module';
import processBackendModule from '@theia/process/lib/node/process-backend-module';
import { messagingBackendModule } from '@theia/core/lib/node/messaging/messaging-backend-module';
import terminalBackendModule from '../terminal-backend-module';

export function createTerminalTestContainer() {
    const terminalTestContainer = new Container();
    terminalTestContainer.load(backendApplicationModule);
    terminalTestContainer.load(loggerBackendModule);
    terminalTestContainer.load(messagingBackendModule);
    terminalTestContainer.load(processBackendModule);
    terminalTestContainer.load(terminalBackendModule);
    return terminalTestContainer;
}
