/********************************************************************************
 * Copyright (C) 2019 Red Hat, Inc. and others.
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

import { TitleButton } from './quick-open-service';
import { Emitter } from '../../common/event';
import { DisposableCollection } from '../../common/disposable';
import { FOLDER_ICON, FILE_ICON } from '..';
import { BuiltinThemeProvider } from '../theming';
import URI from '../../common/uri';

export class InputTitleBar {

    private readonly onDidTriggerButtonEmitter: Emitter<TitleButton>;
    private _isAttached: boolean;

    private titleElement: HTMLElement;

    private _title: string | undefined;
    private _step: number | undefined;
    private _totalSteps: number | undefined;
    private _buttons: ReadonlyArray<TitleButton>;

    private disposableCollection: DisposableCollection;
    constructor() {
        this.titleElement = document.createElement('h3');
        this.titleElement.style.flex = '1';
        this.titleElement.style.textAlign = 'center';
        this.titleElement.style.margin = '5px 0';

        this.disposableCollection = new DisposableCollection();
        this.disposableCollection.push(this.onDidTriggerButtonEmitter = new Emitter());
    }

    get onDidTriggerButton() {
        return this.onDidTriggerButtonEmitter.event;
    }

    get isAttached(): boolean {
        return this._isAttached;
    }

    set isAttached(isAttached: boolean) {
        this._isAttached = isAttached;
    }

    set title(title: string | undefined) {
        this._title = title;
        this.updateInnerTitleText();
    }

    get title(): string | undefined {
        return this._title;
    }

    set step(step: number | undefined) {
        this._step = step;
        this.updateInnerTitleText();
    }

    get step(): number | undefined {
        return this._step;
    }

    set totalSteps(totalSteps: number | undefined) {
        this._totalSteps = totalSteps;
        this.updateInnerTitleText();
    }

    get totalSteps(): number | undefined {
        return this._totalSteps;
    }

    set buttons(buttons: ReadonlyArray<TitleButton> | undefined) {
        if (buttons === undefined) {
            this._buttons = [];
            return;
        }

        this._buttons = buttons;
    }

    get buttons() {
        return this._buttons;
    }

    private updateInnerTitleText(): void {
        let innerTitle = '';

        if (this.title) {
            innerTitle = this.title + ' ';
        }

        if (this.step && this.totalSteps) {
            innerTitle += `(${this.step} / ${this.totalSteps})`;
        } else if (this.step) {
            innerTitle += this.step;
        }

        this.titleElement.innerText = innerTitle;
    }

    // Left buttons are for the buttons dervied from QuickInputButtons
    private getLeftButtons() {
        if (this._buttons === undefined || this._buttons.length === 0) {
            return [];
        }
        return this._buttons.filter(val => ('id' in val.iconPath && val.iconPath.id === 'Back'));
    }

    private getRightButtons() {
        if (this._buttons === undefined || this._buttons.length === 0) {
            return [];
        }
        return this._buttons.filter(val => ('id' in val.iconPath && val.iconPath.id !== 'Back'));
    }

    /**
     * Take in an ID and return a list
     * of associates css classes
     */
    private iconPathIDtoClass(id: string) {
        let iconClass = '';
        switch (id) {
            case 'folder': {
                iconClass = FOLDER_ICON;
                break;
            }
            case 'file': {
                iconClass = FILE_ICON;
                break;
            }
            case 'Back': {
                iconClass = 'fa fa-arrow-left';
                break;
            }
        }
        return iconClass.split(' ');
    }

    private createButtonElement(buttons: TitleButton[], themeID: string) {
        const buttonDiv = document.createElement('div');
        buttonDiv.style.display = 'inline-flex';
        for (const b of buttons) {
            const aElement = document.createElement('a');
            aElement.style.width = '20px';
            aElement.style.height = '20px';

            if ('id' in b.iconPath) {
                const iconClass = this.iconPathIDtoClass(b.iconPath.id);
                aElement.classList.add(...iconClass);
            } else if ('light' in b.iconPath && 'dark' in b.iconPath) {
                const potentialIcon = b.iconPath as unknown as { dark: URI, light: URI };
                aElement.style.backgroundImage = `url(\'${themeID === BuiltinThemeProvider.lightTheme.id ? potentialIcon.light : potentialIcon.dark}\')`;
            } else {
                aElement.style.backgroundImage = `url(\'${b.iconPath.toString()}\')`;
            }

            aElement.classList.add('icon');
            aElement.style.display = 'flex';
            aElement.style.justifyContent = 'center';
            aElement.style.alignItems = 'center';
            aElement.title = b.tooltip ? b.tooltip : '';
            aElement.onclick = () => {
                this.onDidTriggerButtonEmitter.fire(b);
            };
            buttonDiv.appendChild(aElement);
        }
        return buttonDiv;
    }

    private createTitleBarDiv() {
        const div = document.createElement('div');
        div.style.height = '1%'; // Reset the height to be valid
        div.style.display = 'flex';
        div.style.flexDirection = 'row';
        div.style.flexWrap = 'wrap';
        div.style.justifyContent = 'flex-start';
        div.style.alignItems = 'center';
        return div;
    }

    private createLeftButtonDiv(themeID: string) {
        const leftButtonDiv = document.createElement('div'); // Holds all the buttons that get added to the left
        // leftButtonDiv.style.display = 'inherit';
        leftButtonDiv.style.flex = '1';
        leftButtonDiv.style.textAlign = 'left';

        leftButtonDiv.appendChild(this.createButtonElement(this.getLeftButtons(), themeID));
        return leftButtonDiv;
    }

    private createRightButtonDiv(themeID: string) {
        const rightButtonDiv = document.createElement('div');
        rightButtonDiv.style.flex = '1';
        rightButtonDiv.style.textAlign = 'right';

        rightButtonDiv.appendChild(this.createButtonElement(this.getRightButtons(), themeID));
        return rightButtonDiv;
    }

    public attachTitleBar(themeID: string) {
        const div = this.createTitleBarDiv();

        this.updateInnerTitleText();

        div.appendChild(this.createLeftButtonDiv(themeID));
        div.appendChild(this.titleElement);
        div.appendChild(this.createRightButtonDiv(themeID));

        return div;
    }

    shouldShowTitleBar(): boolean {
        return ((this._step !== undefined) || (this._title !== undefined));
    }

    dispose() {
        this.disposableCollection.dispose();
    }

}
