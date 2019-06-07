/********************************************************************************
 * Copyright (C) 2018 TypeFox and others.
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

import { inject, injectable } from 'inversify';
import { QuickOpenService, TitleButton } from './quick-open-service';
import { QuickOpenItem, QuickOpenMode } from './quick-open-model';
import { Deferred } from '../../common/promise-util';
import { MaybePromise } from '../../common/types';
import { MessageType } from '../../common/message-service-protocol';
import { Emitter, Event } from '../../common/event';
import { InputTitleBar } from './quick-input-title-bar';
import { ThemeService } from '../theming';

export interface QuickInputOptions {

    /**
     * Show the progress indicator if true
     */
    busy?: boolean

    /**
     * Allow user input
     */
    enabled?: boolean;

    /**
     * Current step count
     */
    step?: number | undefined

    /**
     * The title of the input
     */
    title?: string | undefined

    /**
     * Total number of steps
     */
    totalSteps?: number | undefined

    /**
     * Buttons that are displayed on the title panel
     */
    buttons?: ReadonlyArray<TitleButton>

    /**
     * Text for when there is a problem with the current input value
     */
    validationMessage?: string | undefined;

    /**
     * The prefill value.
     */
    value?: string;

    /**
     * The text to display under the input box.
     */
    prompt?: string;

    /**
     * The place holder in the input box to guide the user what to type.
     */
    placeHolder?: string;

    /**
     * Set to `true` to show a password prompt that will not show the typed value.
     */
    password?: boolean;

    /**
     * Set to `true` to keep the input box open when focus moves to another part of the editor or to another window.
     */
    ignoreFocusOut?: boolean;

    /**
     * An optional function that will be called to validate input and to give a hint
     * to the user.
     *
     * @param value The current value of the input box.
     * @return Return `undefined`, or the empty string when 'value' is valid.
     */
    validateInput?(value: string): MaybePromise<string | undefined>;
}

@injectable()
export class QuickInputService {

    @inject(QuickOpenService)
    protected readonly quickOpenService: QuickOpenService;

    @inject(ThemeService)
    protected readonly themeService: ThemeService;

    protected _titlePanel: InputTitleBar;
    protected titleBarContainer: HTMLElement;
    protected titleElement: HTMLElement | undefined;

    constructor() {
        this._titlePanel = new InputTitleBar();
        this.createTitleBarContainer();
    }

    open(options: QuickInputOptions): Promise<string | undefined> {
        const result = new Deferred<string | undefined>();
        const prompt = this.createPrompt(options.prompt);
        let label = prompt;
        let currentText = '';
        const validateInput = options && options.validateInput;

        this.titlePanel.title = options.title;
        this.titlePanel.step = options.step;
        this.titlePanel.totalSteps = options.totalSteps;
        this.titlePanel.buttons = options.buttons;
        this.removeTitleElement();
        this.titlePanel.isAttached = false;

        this.quickOpenService.open({
            onType: async (lookFor, acceptor) => {
                const error = validateInput && lookFor !== undefined ? await validateInput(lookFor) : undefined;
                label = error || prompt;
                if (error) {
                    this.quickOpenService.showDecoration(MessageType.Error);
                } else {
                    this.quickOpenService.hideDecoration();
                }
                acceptor([new QuickOpenItem({
                    label,
                    run: mode => {
                        if (!error && mode === QuickOpenMode.OPEN) {
                            result.resolve(currentText);
                            this.onDidAcceptEmitter.fire(undefined);
                            return true;
                        }
                        return false;
                    }
                })]);
                currentText = lookFor;
            }
        }, {
                prefix: options.value,
                placeholder: options.placeHolder,
                password: options.password,
                ignoreFocusOut: options.ignoreFocusOut,
                busy: options.busy,
                enabled: options.enabled,
                onClose: () => {
                    result.resolve(undefined);
                    this.titlePanel.dispose();
                    this.onDidHideEmitter.fire(undefined);
                    this.removeTitleElement();
                    this.createTitleBarContainer();
                }
            });
        this.attachTitleBarIfNeeded();
        if (this.titlePanel.shouldShowTitleBar()) {
            this.quickOpenService.widgetNode.prepend(this.titleBarContainer);
        }
        return result.promise;
    }

    private createTitleBarContainer(): void {
        this.titleBarContainer = document.createElement('div');
        this.titleBarContainer.style.backgroundColor = 'var(--theia-menu-color0)';
    }

    setStep(step: number | undefined) {
        this.titlePanel.step = step;
        this.attachTitleBarIfNeeded();
    }

    setTitle(title: string | undefined) {
        this.titlePanel.title = title;
        this.attachTitleBarIfNeeded();
    }

    setTotalSteps(totalSteps: number | undefined) {
        this.titlePanel.totalSteps = totalSteps;
    }

    setButtons(buttons: ReadonlyArray<TitleButton>) {
        this.titlePanel.buttons = buttons;
        this.attachTitleBarIfNeeded();
    }

    get titlePanel(): InputTitleBar {
        return this._titlePanel;
    }

    private removeTitleElement(): void {
        if (this.titleElement) {
            this.titleElement.remove();
        }
    }

    private attachTitleBarIfNeeded(): void {
        this.removeTitleElement();
        this.titlePanel.isAttached = false;
        if (this.titlePanel.shouldShowTitleBar()) {
            if (!this.quickOpenService.widgetNode.contains(this.titleBarContainer)) {
                this.quickOpenService.widgetNode.prepend(this.titleBarContainer);
            }
            const currentTheme = this.themeService.getCurrentTheme();
            this.titleElement = this.titlePanel.attachTitleBar(currentTheme.id);
            this.titleBarContainer.appendChild(this.titleElement);
            this.titlePanel.isAttached = true;
        }
    }

    protected defaultPrompt = "Press 'Enter' to confirm your input or 'Escape' to cancel";
    protected createPrompt(prompt?: string): string {
        return prompt ? `${prompt} (${this.defaultPrompt})` : this.defaultPrompt;
    }

    readonly onDidAcceptEmitter: Emitter<void> = new Emitter();
    get onDidAccept(): Event<void> {
        return this.onDidAcceptEmitter.event;
    }

    readonly onDidHideEmitter: Emitter<void> = new Emitter();
    get onDidHide(): Event<void> {
        return this.onDidHideEmitter.event;
    }

}
