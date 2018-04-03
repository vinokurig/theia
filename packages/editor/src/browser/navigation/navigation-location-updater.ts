/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from 'inversify';
import { NavigationLocation } from './navigation-location';

/**
 * A navigation location updater that is responsible for adapting editor navigation locations.
 *
 * - Inserting or deleting text before the position shifts the position accordingly.
 * - Inserting text at the position offset shifts the position accordingly.
 * - Inserting or deleting text strictly contained by the position shrinks or stretches the position.
 * - Inserting or deleting text after a position does not affect the position.
 * - Deleting text which strictly contains the position deletes the position.
 * Note that the position is not deleted if its only shrunken to length zero. To delete a position, the modification must delete from
 * strictly before to strictly after the position.
 * - Replacing text contained by the position shrinks or expands the position (but does not shift it), such that the final position
 * contains the original position and the replacing text.
 * - Replacing text overlapping the position in other ways is considered as a sequence of first deleting the replaced text and
 * afterwards inserting the new text. Thus, a position is shrunken and can then be shifted (if the replaced text overlaps the offset of the position).
 */
@injectable()
export class NavigationLocationUpdater {

    /**
     * Checks whether `candidate` has to be updated when applying `other`.
     *  - `false` if the `other` does not affect the `candidate`.
     *  - A `NavigationLocation` object if the `candidate` has to be replaced with the return value.
     *  - `undefined` if the candidate has to be deleted.
     */
    affects(candidate: NavigationLocation, other: NavigationLocation): false | NavigationLocation | undefined {
        if (candidate.uri.toString() !== other.uri.toString()) {
            return false;
        }
        return false;
    }

}
