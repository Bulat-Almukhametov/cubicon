import { TextField } from "@mui/material";
import { createFilterOptions } from '@mui/material/Autocomplete';
import { default as MuiAutocomplete } from '@mui/material/Autocomplete';

export const AUTOCOMPLETE_OPTION_NO_VALUE = -1;
export const AUTOCOMPLETE_OPTION_NEW_ENTITY_VALUE = 0;
export const AUTOCOMPLETE_OPTION_LOADING_DISPLAY_NAME = 'Загрузка...';
export const AUTOCOMPLETE_MIN_SYMBOLS = 3;
export const AUTOCOMPLETE_OPTION_MIN_SYMBOLS_DISPLAY_NAME = `Введите мин. ${AUTOCOMPLETE_MIN_SYMBOLS} символа`;

export class AutocompleteOption {
    constructor(
        public id: number,
        public displayName: string,
        public disabled = false, 
        public isManuallyCreated = false,
    ) {}
}

type AutocompleteProps = {
    allOptions: AutocompleteOption[],
    selectedOption: AutocompleteOption | null,
    optionsNotFoundDisplayName: string,
    allowCreating: boolean,
    helperLabelText: string,
    placeholderText: string,
    children: React.ReactNode,
    onOptionSelect: (option: AutocompleteOption) => void,
    onOptionReset: () => void,

    nameFormatText?: string,
    addNewEntityOptionDisplayName?: string,
    isInputValueValid?: (inputValue: string) => boolean,
}

// TODO consider name prefix, e.g CMAutocomplete
const Autocomplete = (props: AutocompleteProps) => {
    const { allOptions, selectedOption, optionsNotFoundDisplayName, allowCreating, addNewEntityOptionDisplayName, 
        helperLabelText, placeholderText, nameFormatText, isInputValueValid, onOptionSelect, onOptionReset } = props;

    const filterCities = createFilterOptions<AutocompleteOption>();

    return (
        <MuiAutocomplete 
            options={allOptions}
            filterOptions={(_, params) => {
                if (!allOptions.length) 
                    return [ new AutocompleteOption(AUTOCOMPLETE_OPTION_NO_VALUE, AUTOCOMPLETE_OPTION_LOADING_DISPLAY_NAME, true) ];

                const { inputValue } = params;
                if (inputValue.length < AUTOCOMPLETE_MIN_SYMBOLS) 
                    return [ new AutocompleteOption(AUTOCOMPLETE_OPTION_NO_VALUE, AUTOCOMPLETE_OPTION_MIN_SYMBOLS_DISPLAY_NAME, true) ];

                const filtered = filterCities(allOptions, params);

                if (!filtered.length) {
                    if (allowCreating) {
                        if (!addNewEntityOptionDisplayName || !nameFormatText || !isInputValueValid)
                            throw Error('all the input properties are mandatory in allowCreating = true mode but some of them were not provided.')

                        if (!isInputValueValid(inputValue))
                            return [ new AutocompleteOption(AUTOCOMPLETE_OPTION_NO_VALUE, nameFormatText, true) ];

                        return [ new AutocompleteOption(AUTOCOMPLETE_OPTION_NEW_ENTITY_VALUE, `${addNewEntityOptionDisplayName}${inputValue}`) ];
                    } else {
                        return [ new AutocompleteOption(AUTOCOMPLETE_OPTION_NO_VALUE, optionsNotFoundDisplayName, true) ];
                    }
                } 

                return filtered;  
            }}
            getOptionLabel={(option) => {
                return option.displayName;
            }}
            value={selectedOption}
            onChange={(_, option) => {
                if (!!option) {
                    onOptionSelect(option);
                } else {
                    onOptionReset();
                }
            }}
            renderInput={(params) => {
                // vs code complains about value property of inputProps here, so add 'any'
                const props = params.inputProps as any;
                const optionDisplayValue = props.value;
                
                // remove add participant text after selection
                if (optionDisplayValue.indexOf(addNewEntityOptionDisplayName) > -1) {
                    props.value = optionDisplayValue.split(addNewEntityOptionDisplayName)[1];
                }

                return (
                    <TextField 
                        {...params} 
                        label={helperLabelText} 
                        placeholder={placeholderText}
                        variant='standard'
                    />
                )
            }}
            renderOption={(props, option) => {
                return (
                    <span {...props} style={{ color: '#bcb7b7' }} key={option.id}>
                        {`${option.displayName} ${option.isManuallyCreated ? ' (новый)' : ''}`}
                    </span>
                );
            }}
            getOptionDisabled={(option) => option.disabled}
            isOptionEqualToValue={(option, value) => option.id === value.id}
        />
    );
}

export default Autocomplete;
