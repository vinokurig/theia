/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ContainerModule } from "inversify";
import { bindContributionProvider, ConnectionHandler } from '../../common';
import { BackendApplicationContribution } from "../backend-application";
import { MessagingContribution } from './messaging-contribution';
import { MessagingService } from "./messaging-service";

export const messagingBackendModule = new ContainerModule(bind => {
    bind(BackendApplicationContribution).to(MessagingContribution).inSingletonScope();
    bindContributionProvider(bind, ConnectionHandler);
    bindContributionProvider(bind, MessagingService.Contribution);
});
