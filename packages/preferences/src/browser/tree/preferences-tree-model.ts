/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { PreferenceSchema, TreeModelImpl, TreeNode} from "@theia/core/lib/browser";
import {PreferencesTree} from "../tree/preferences-tree";

@injectable()
export class PreferencesTreeModel extends TreeModelImpl {

    @inject(PreferencesTree) protected readonly tree: PreferencesTree;

    getTree(): PreferencesTree {
        return this.tree;
    }

    async initialize(schemas: PreferenceSchema[]): Promise<void> {

    }

    protected doOpenNode(node: TreeNode): void {
        // do nothing (in particular do not expand the node)
    }

    protected toTreeNode(name: string): TreeNode {
        return {id: 'id', name: name, parent: undefined, visible: true};
    }
}
