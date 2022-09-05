import { UserUIItem } from "../components/EditResults"
import { AutocompleteOption } from "../components/shared/Autocomplete"
import { User } from "../models/state"

export const getUserDisplayName = (user: User | UserUIItem) => {
    return `${user.firstName} ${user.lastName}`
}

// valid value example: Иван Петров
export const isUserInputValueValid = (input: string) => {
    return !!input && input.split(' ').length === 2 && !!input.split(' ')[1];
}

export const getUserFirstName = (userOption: AutocompleteOption) => {
    if (!userOption.displayName) {
        throw new Error('cannot get user last name - invalid user option display value!');
    }

    return userOption.displayName.split(' ')[0];
}

export const getUserLastName = (userOption: AutocompleteOption) => {
    if (!userOption.displayName || userOption.displayName.split(' ').length < 2) {
        throw new Error('cannot get user last name - invalid user option display value!');
    }

    return userOption.displayName.split(' ')[1];
}
