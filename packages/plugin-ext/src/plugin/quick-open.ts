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
import { QuickOpenExt, PLUGIN_RPC_CONTEXT as Ext, QuickOpenMain, PickOpenItem, ITransferInputBox } from '../api/plugin-api';
import { QuickPickOptions, QuickPickItem, InputBoxOptions, InputBox, QuickInputButton, QuickPick } from '@theia/plugin';
import { CancellationToken } from '@theia/core/lib/common/cancellation';
import { RPCProtocol } from '../api/rpc-protocol';
import { anyPromise } from '../api/async-util';
import { hookCancellationToken } from '../api/async-util';
import { Emitter, Event } from '@theia/core/lib/common/event';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { TitleButton } from '@theia/core/lib/browser/quick-open/quick-open-service';

export type Item = string | QuickPickItem;

export class QuickOpenExtImpl implements QuickOpenExt {
    private proxy: QuickOpenMain;
    private selectItemHandler: undefined | ((handle: number) => void);
    private validateInputHandler: undefined | ((input: string) => string | PromiseLike<string | undefined> | undefined);
    private onDidAcceptInputEmitter: Emitter<void>;
    private onDidHideEmitter: Emitter<void>;
    private onDidTriggerButtonEmitter: Emitter<QuickInputButton>;

    constructor(rpc: RPCProtocol) {
        this.proxy = rpc.getProxy(Ext.QUICK_OPEN_MAIN);
        this.onDidAcceptInputEmitter = new Emitter();
        this.onDidHideEmitter = new Emitter();
        this.onDidTriggerButtonEmitter = new Emitter();
    }
    $onItemSelected(handle: number): void {
        if (this.selectItemHandler) {
            this.selectItemHandler(handle);
        }
    }
    $validateInput(input: string): PromiseLike<string | undefined> | undefined {
        if (this.validateInputHandler) {
            return Promise.resolve(this.validateInputHandler(input));
        }
        return undefined;
    }

    showQuickPick(promiseOrItems: QuickPickItem[] | PromiseLike<QuickPickItem[]>, options?: QuickPickOptions, token?: CancellationToken): PromiseLike<QuickPickItem | undefined>;
    // tslint:disable-next-line:max-line-length
    showQuickPick(promiseOrItems: QuickPickItem[] | PromiseLike<QuickPickItem[]>, options?: QuickPickOptions & { canSelectMany: true; }, token?: CancellationToken): PromiseLike<QuickPickItem[] | undefined>;
    showQuickPick(promiseOrItems: string[] | PromiseLike<string[]>, options?: QuickPickOptions, token?: CancellationToken): PromiseLike<string | undefined>;
    // tslint:disable-next-line:max-line-length
    showQuickPick(promiseOrItems: Item[] | PromiseLike<Item[]>, options?: QuickPickOptions, token: CancellationToken = CancellationToken.None): PromiseLike<Item | Item[] | undefined> {
        this.selectItemHandler = undefined;
        const itemPromise = Promise.resolve(promiseOrItems);
        const widgetPromise = this.proxy.$show({
            canSelectMany: options && options.canPickMany,
            placeHolder: options && options.placeHolder,
            autoFocus: { autoFocusFirstEntry: true },
            matchOnDescription: options && options.matchOnDescription,
            matchOnDetail: options && options.matchOnDetail,
            ignoreFocusLost: options && options.ignoreFocusOut
        });

        const promise = anyPromise(<PromiseLike<number | Item[]>[]>[widgetPromise, itemPromise]).then(values => {
            if (values.key === 0) {
                return undefined;
            }
            return itemPromise.then(items => {
                const pickItems: PickOpenItem[] = [];
                for (let handle = 0; handle < items.length; handle++) {
                    const item = items[handle];
                    let label: string;
                    let description: string | undefined;
                    let detail: string | undefined;
                    let picked: boolean | undefined;
                    if (typeof item === 'string') {
                        label = item;
                    } else {
                        ({ label, description, detail, picked } = item);
                    }
                    pickItems.push({
                        label,
                        description,
                        handle,
                        detail,
                        picked
                    });
                }

                if (options && typeof options.onDidSelectItem === 'function') {
                    this.selectItemHandler = handle => {
                        options.onDidSelectItem!(items[handle]);
                    };
                }

                this.proxy.$setItems(pickItems);

                return widgetPromise.then(handle => {
                    if (typeof handle === 'number') {
                        return items[handle];
                    } else if (Array.isArray(handle)) {
                        return handle.map(h => items[h]);
                    }
                    return undefined;
                });
            }, err => {
                this.proxy.$setError(err);
                return Promise.reject(err);
            });
        });
        return hookCancellationToken<Item | Item[] | undefined>(token, promise);
    }

    createQuickPick<T extends QuickPickItem>(): QuickPick<T> {
        return new QuickPickExt(this);
    }

    showInput(options?: InputBoxOptions, token: CancellationToken = CancellationToken.None): PromiseLike<string | undefined> {
        this.validateInputHandler = options && options.validateInput;

        if (!options) {
            options = {
                placeHolder: ''
            };
        }

        const promise = this.proxy.$input(options, typeof this.validateInputHandler === 'function');
        return hookCancellationToken(token, promise);
    }

    showInputBox(options: ITransferInputBox): void {
        this.validateInputHandler = options && options.validateInput;
        this.proxy.$showInputBox(options);
    }

    createInputBox(): InputBox {
        return new InputBoxExt(this, this.onDidAcceptInputEmitter, this.onDidHideEmitter, this.onDidTriggerButtonEmitter, this.proxy);
    }

    async $acceptInput(): Promise<void> {
        this.onDidAcceptInputEmitter.fire(undefined);
    }

    async $acceptHide(): Promise<void> {
        this.onDidHideEmitter.fire(undefined);
    }

    async $acceptButton(btn: QuickInputButton): Promise<void> {
        this.onDidTriggerButtonEmitter.fire(btn);
    }
}

/**
 * Base implementation of {@link InputBox} that uses {@link QuickOpenExt}.
 * Missing functionality is going to be implemented in the scope of https://github.com/theia-ide/theia/issues/5109
 */
export class InputBoxExt implements InputBox {

    private _busy: boolean;
    private _buttons: ReadonlyArray<QuickInputButton>;
    private _enabled: boolean;
    private _ignoreFocusOut: boolean;
    private _password: boolean;
    private _placeholder: string | undefined;
    private _prompt: string | undefined;
    private _step: number | undefined;
    private _title: string | undefined;
    private _totalSteps: number | undefined;
    private _validationMessage: string | undefined;
    private _value: string;

    private readonly disposables: DisposableCollection;
    private readonly onDidChangeValueEmitter: Emitter<string>;
    private visible: boolean;

    constructor(readonly quickOpen: QuickOpenExtImpl,
        readonly onDidAcceptEmitter: Emitter<void>,
        readonly onDidHideEmitter: Emitter<void>,
        readonly onDidTriggerButtonEmitter: Emitter<QuickInputButton>,
        readonly quickOpenMain: QuickOpenMain) {

        this.disposables = new DisposableCollection();
        this.disposables.push(this.onDidChangeValueEmitter = new Emitter());
        this.visible = false;

        this.buttons = [];
        this.enabled = true;
        this.busy = false;
        this.ignoreFocusOut = false;
        this.password = false;
        this.value = '';
    }

    get onDidChangeValue(): Event<string> {
        return this.onDidChangeValueEmitter.event;
    }

    get onDidAccept(): Event<void> {
        return this.onDidAcceptEmitter.event;
    }

    get onDidHide(): Event<void> {
        this.visible = false;
        return this.onDidHideEmitter.event;
    }

    get onDidTriggerButton(): Event<QuickInputButton> {
        return this.onDidTriggerButtonEmitter.event;
    }

    get title(): string | undefined {
        return this._title;
    }

    set title(title: string | undefined) {
        this._title = title;
        this.update();
    }

    get step(): number | undefined {
        return this._step;
    }

    set step(step: number | undefined) {
        this._step = step;
        this.update();
    }

    get totalSteps(): number | undefined {
        return this._totalSteps;
    }

    set totalSteps(totalSteps: number | undefined) {
        this._totalSteps = totalSteps;
        this.update();
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(enabled: boolean) {
        this._enabled = enabled;
        this.update();
    }

    get busy(): boolean {
        return this._busy;
    }

    set busy(busy: boolean) {
        this._busy = busy;
        this.update();
    }

    get ignoreFocusOut(): boolean {
        return this._ignoreFocusOut;
    }

    set ignoreFocusOut(ignoreFocusOut: boolean) {
        this._ignoreFocusOut = ignoreFocusOut;
        this.update();
    }

    get buttons(): ReadonlyArray<QuickInputButton> {
        return this._buttons;
    }

    set buttons(buttons: ReadonlyArray<QuickInputButton>) {
        this._buttons = buttons;
        this.update();
    }

    get password(): boolean {
        return this._password;
    }

    set password(password: boolean) {
        this._password = password;
        this.update();
    }

    get placeholder(): string | undefined {
        return this._placeholder;
    }

    set placeholder(placeholder: string | undefined) {
        this._placeholder = placeholder;
        this.update();
    }

    get prompt(): string | undefined {
        return this._prompt;
    }

    set prompt(prompt: string | undefined) {
        this._prompt = prompt;
        this.update();
    }

    get validationMessage(): string | undefined {
        return this._validationMessage;
    }

    set validationMessage(validationMessage: string | undefined) {
        this._validationMessage = validationMessage;
        this.update();
    }

    get value(): string {
        return this._value;
    }

    set value(value: string) {
        this._value = value;
        this.update();
    }

    protected update(): void {
        /**
         * The args are just going to be set when we call show for the first time.
         * We return early when its invisible to avoid race condition
         */
        if (!this.visible) {
            return;
        }

        this.quickOpenMain.$setInputBox(
            this.busy,
            this.buttons,
            this.enabled,
            this.ignoreFocusOut,
            this.password,
            this.placeholder,
            this.prompt,
            this.step,
            this.title,
            this.totalSteps,
            this.validationMessage,
            this.value
        );
    }

    dispose(): void {
        this.disposables.dispose();
    }

    hide(): void {
        this.dispose();
    }

    show(): void {
        const update = (value: string) => {
            this.onDidChangeValueEmitter.fire(value);
            if (this.validationMessage && this.validationMessage.length > 0) {
                return this.validationMessage;
            }
        };
        this.quickOpen.showInputBox({
            busy: this.busy,
            buttons: this.buttons as ReadonlyArray<TitleButton>,
            enabled: this.enabled,
            ignoreFocusOut: this.ignoreFocusOut,
            password: this.password,
            placeholder: this.placeholder,
            prompt: this.prompt,
            step: this.step,
            title: this.title,
            totalSteps: this.totalSteps,
            validationMessage: this.validationMessage,
            value: this.value,
            validateInput(value: string): string | undefined {
                if (value.length > 0) {
                    return update(value);
                }
            }
        });
        this.visible = true;
    }
}

/**
 * Base implementation of {@link QuickPick} that uses {@link QuickOpenExt}.
 * Missing functionality is going to be implemented in the scope of https://github.com/theia-ide/theia/issues/5059
 */
export class QuickPickExt<T extends QuickPickItem> implements QuickPick<T> {

    busy: boolean;
    buttons: ReadonlyArray<QuickInputButton>;
    canSelectMany: boolean;
    enabled: boolean;
    ignoreFocusOut: boolean;
    matchOnDescription: boolean;
    matchOnDetail: boolean;
    selectedItems: ReadonlyArray<T>;
    step: number | undefined;
    title: string | undefined;
    totalSteps: number | undefined;
    value: string;

    private _items: T[];
    private _activeItems: T[];
    private _placeholder: string | undefined;
    private disposableCollection: DisposableCollection;
    private readonly onDidHideEmitter: Emitter<void>;
    private readonly onDidAcceptEmitter: Emitter<void>;
    private readonly onDidChangeActiveEmitter: Emitter<T[]>;
    private readonly onDidChangeSelectionEmitter: Emitter<T[]>;
    private readonly onDidChangeValueEmitter: Emitter<string>;
    private readonly onDidTriggerButtonEmitter: Emitter<QuickInputButton>;

    constructor(readonly quickOpen: QuickOpenExtImpl) {
        this._items = [];
        this._activeItems = [];
        this._placeholder = '';
        this.buttons = [];
        this.step = 0;
        this.title = '';
        this.totalSteps = 0;
        this.value = '';
        this.disposableCollection = new DisposableCollection();
        this.disposableCollection.push(this.onDidHideEmitter = new Emitter());
        this.disposableCollection.push(this.onDidAcceptEmitter = new Emitter());
        this.disposableCollection.push(this.onDidChangeActiveEmitter = new Emitter());
        this.disposableCollection.push(this.onDidChangeSelectionEmitter = new Emitter());
        this.disposableCollection.push(this.onDidChangeValueEmitter = new Emitter());
        this.disposableCollection.push(this.onDidTriggerButtonEmitter = new Emitter());
    }

    get items(): T[] {
        return this._items;
    }

    set items(activeItems: T[]) {
        this._items = activeItems;
    }

    get activeItems(): T[] {
        return this._activeItems;
    }

    set activeItems(activeItems: T[]) {
        this._activeItems = activeItems;
    }

    get onDidAccept(): Event<void> {
        return this.onDidAcceptEmitter.event;
    }

    get placeholder(): string | undefined {
        return this._placeholder;
    }
    set placeholder(placeholder: string | undefined) {
        this._placeholder = placeholder;
    }

    get onDidChangeActive(): Event<T[]> {
        return this.onDidChangeActiveEmitter.event;
    }

    get onDidChangeSelection(): Event<T[]> {
        return this.onDidChangeSelectionEmitter.event;
    }

    get onDidChangeValue(): Event<string> {
        return this.onDidChangeValueEmitter.event;
    }

    get onDidTriggerButton(): Event<QuickInputButton> {
        return this.onDidTriggerButtonEmitter.event;
    }

    get onDidHide(): Event<void> {
        return this.onDidHideEmitter.event;
    }

    dispose(): void {
        this.disposableCollection.dispose();
    }

    hide(): void {
        this.dispose();
    }

    show(): void {
        const hide = () => {
            this.onDidHideEmitter.fire(undefined);
        };
        const selectItem = (item: T) => {
            this.activeItems = [item];
            this.onDidAcceptEmitter.fire(undefined);
            this.onDidChangeSelectionEmitter.fire([item]);
        };
        this.quickOpen.showQuickPick(this.items.map(item => item as T), {
            // tslint:disable-next-line:no-any
            onDidSelectItem(item: T | string): any {
                if (typeof item !== 'string') {
                    selectItem(item);
                }
                hide();
            }, placeHolder: this.placeholder
        });
    }

}
