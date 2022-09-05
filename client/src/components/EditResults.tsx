import AddCircleIcon from '@mui/icons-material/AddCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditIcon from '@mui/icons-material/Edit';
import ErrorIcon from '@mui/icons-material/Error';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DNF, DNF_DISPLAY_VALUE, DNS, DNS_DISPLAY_VALUE } from '../constants';
import { HttpResponseStatusCode } from '../enums';
import { Contest, ErrorHandlerProps, User } from '../models/state';
import { handleResponses } from '../services/http-response.service';
import { getBestAndAverage, toDelimitedString, toMilliseconds } from '../services/results.helper';
import { getUserDisplayName, getUserFirstName, getUserLastName, isUserInputValueValid } from '../services/users.helper';
import './EditResults.scss';
import Autocomplete, { AutocompleteOption } from './shared/Autocomplete';
import ContestNotFound from './shared/ContestNotFound';
import FormButton from './shared/FormButton';
import Loading from './shared/Loading';

export type UserUIItem = Omit<User, 'city' | 'cityId'>;

// TODO use this model for input row only. The values should not be null for the results
type ResultUIItem = {
    id: number | null,
    attempt1: string | null,
    attempt2: string | null,
    attempt3: string | null,
    attempt4: string | null,
    attempt5: string | null,
    best: string | null,
    average: string | null,
    performedBy: UserUIItem | null,
    roundId: number,

    // indicates that the result is being edited
    isEditing: boolean,

    // indicates that the result was added using UI and not sent to backend yet
    isAdded: boolean,
}

type ResulstFormState = {
    selectedRoundId: number,
    contestResults: ResultUIItem[],
    editingResult: ResultUIItem,

    // contest info loaded from backend
    contest: Contest | null,
}

type ResultsComponentProps = ErrorHandlerProps & {
    isEditingMode: boolean,
}

enum EditResultsPageStatus {
    Idle,
    Loading,
    Loaded,
    ContestNotFound,
    Error,
}

// TODO use react-hook-form for form handling
// TODO add validation error messages
// TODO add tooltips
const EditResults = (props: ResultsComponentProps) => {
    const { isEditingMode } = props;
    
    const navigate = useNavigate();
    const { id: contestId } = useParams();
    const { search } = useLocation();

    const defaultEditingResult = useMemo(() => {
        return {
            id: null,
            performedBy: null,
            attempt1: null,
            attempt2: null,
            attempt3: null,
            attempt4: null,
            attempt5: null,
            best: null,
            average: null,
            isValid: false,
            isEditing: false,
            isAdded: false,
            roundId: 0,
        };
    }, []);

    const [ state, setState ] = useState<ResulstFormState>({
        contest: null,
        selectedRoundId: 0,
        contestResults: [],
        editingResult: defaultEditingResult,
    });
    const [ selectedUserOption, setSelectedUserOption ] = useState<AutocompleteOption | null>(null);
    const [ allUserOptions, setAllUserOptions ] = useState<AutocompleteOption[]>([]);
    const [ status, setStatus ] = useState<EditResultsPageStatus>(EditResultsPageStatus.Idle);

    const addNotification = props.addNotification;
    const createNewUserText = 'Создать участника: ';
    
    useEffect(() => {
        const contestIdNum = Number(contestId);

        if (isNaN(contestIdNum) || contestIdNum < 0) {
            addNotification({ message: 'Произошла ошибка при загрузке контеста. Повторите попытку позже.' });
            setStatus(EditResultsPageStatus.Error);

            return;
        }

        const getContest = fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/contests/${contestIdNum}`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        });

        const getUsers = fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/users`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        });

        setStatus(EditResultsPageStatus.Loading);

        // TODO error handling
        Promise.all([ getContest, getUsers ])
            .then(responses => {
                handleResponses(responses);

                return Promise.all(responses.map(r => r.json()));
            })
            .then(([contest, users]) => {
                // TODO find a way to preserve return types
                setAllUserOptions(users.map((u: User) => {
                    return new AutocompleteOption(u.id, getUserDisplayName(u));
                }));

                const contestResults = (contest as Contest).rounds.flatMap(round => round.results).map(r => {
                    const resultUIItem = {
                        id: r.id,
                        attempt1: toDelimitedString(r.attempt1),
                        attempt2: toDelimitedString(r.attempt2),
                        attempt3: toDelimitedString(r.attempt3),
                        attempt4: toDelimitedString(r.attempt4),
                        attempt5: toDelimitedString(r.attempt5),
                        best: toDelimitedString(r.best),
                        average: toDelimitedString(r.average),
                        performedBy: {
                            id: r.performedBy.id,
                            firstName: r.performedBy.firstName,
                            lastName: r.performedBy.lastName,
                        },
                        roundId: r.roundId,
                    } as ResultUIItem;

                    return resultUIItem;
                });

                setState({
                    contest,
                    selectedRoundId: contest.rounds[0].id,
                    contestResults,
                    editingResult: defaultEditingResult,
                });
                setStatus(EditResultsPageStatus.Loaded);
            })
            .catch((err) => {
                if (err.message === HttpResponseStatusCode.NoContent.toString()) {
                    // do not show notification for empty response
                    setStatus(EditResultsPageStatus.ContestNotFound);
                    return;
                }

                setStatus(EditResultsPageStatus.Error);
                addNotification({ message: 'Произошла ошибка при загрузке контеста. Повторите попытку позже.' });
            });
    }, [ addNotification, contestId, defaultEditingResult ]);
    
    const getAttemptsMs = (result: ResultUIItem) => {
        return [ 
            toMilliseconds(result.attempt1), 
            toMilliseconds(result.attempt2), 
            toMilliseconds(result.attempt3), 
            toMilliseconds(result.attempt4), 
            toMilliseconds(result.attempt5)
        ];
    }

    const selectResultForEditing = (result: ResultUIItem) => {
        setState((state) => {
            return {
                ...state,
                editingResult: result,
                contestResults: [...state.contestResults].map(r => {
                    if (isTheSameUser(r.performedBy, result.performedBy) && r.roundId === state.selectedRoundId) {
                        r.isEditing = true;
                        return r;
                    } else {
                        r.isEditing = false;
                        return r;
                    }
                }),
            };
        });

        const userOption = allUserOptions.find(uo => result.performedBy && uo.displayName === getUserDisplayName(result.performedBy));

        if (!userOption)
            return;

        setSelectedUserOption(userOption);
    }

    // event handlers
    const onRoundSelect = (roundId: number) => {
        onClearResultClick();

        setState(state => {
            return {
                ...state,
                selectedRoundId: roundId,
            };
        });
    }

    const onAddResultClick = () => {
        let newResult: ResultUIItem = { 
            ...editingResult, 
            best: toDelimitedString(
                getBestAndAverage(
                    getAttemptsMs(editingResult)
                )[0]
            ),
            average: toDelimitedString(
                getBestAndAverage(
                    getAttemptsMs(editingResult)
                )[1]
            ),
            roundId: state.selectedRoundId, 
            isAdded: true 
        };

        setState(state => {
            return {
                ...state,
                contestResults: [...state.contestResults, newResult]
            }
        });

        onClearResultClick();
    }

    const onClearResultClick = () => {
        setState(state => {
            return {
                ...state,
                editingResult: defaultEditingResult,
                contestResults: [...state.contestResults].map(r => {
                    r.isEditing = false;
                    return r;
                }),
            }
        });

        setSelectedUserOption(null);
    }

    const onResultSaveClick = () => {  
        setState(state => {
            return {
                ...state,
                editingResult: defaultEditingResult,
                contestResults: [...state.contestResults.map(r => {
                    if (r.isEditing) {
                        const attemptsMs = getAttemptsMs(editingResult);

                        const updatedItem: ResultUIItem = {
                            ...editingResult,
                            best: toDelimitedString(getBestAndAverage(attemptsMs)[0]),
                            average: toDelimitedString(getBestAndAverage(attemptsMs)[1]),
                        };

                        return updatedItem;
                    } else {
                        return r;
                    }
                })]
            }
        })

        onClearResultClick();
    }

    const onAttemptChange = (attemptNumber: number, event: any) => {
        const attemptRawInput = event.target.value;
        const attemptKey = `attempt${attemptNumber}`;
        
        setState((state) => {
            return {
                ...state,
                editingResult: {
                    ...editingResult,
                    [attemptKey]: attemptRawInput,
                },
            };
        });
    }

    const onCompetitorReset = () => {
        setSelectedUserOption(null);

        setState(state => {
            return {
                ...state,
                editingResult: {
                    ...editingResult,
                    performedBy: null,
                },
            }
        });
    }        

    const onCompetitorSelect = (selectedOption: AutocompleteOption) => {
        if (!selectedOption) return;

        // remove add entity text after selection
        if (selectedOption.displayName.includes(createNewUserText))
            selectedOption.displayName = selectedOption.displayName.split(createNewUserText)[1];

        setSelectedUserOption(selectedOption);

        // TODO probably all 3 state updates can be done using only one entry, e.g - selectedOption.selected
        // add a new user to the dropdown options so he can be selected in other rounds
        if (!allUserOptions.find(uo => uo.displayName === selectedOption.displayName)) {
            selectedOption.isManuallyCreated = true;

            setAllUserOptions(userOptions => {
                return [ ...userOptions, selectedOption ];
            });
        }

        const existingResultForCompetitor = selectedRoundResults.find(r => {
            if (!r.performedBy) 
                return false;

            return selectedOption.displayName === getUserDisplayName(r.performedBy);
        });

        if (!!existingResultForCompetitor) {
            selectResultForEditing(existingResultForCompetitor);

            return;
        }

        const performedBy = {
            id: selectedOption.id,
            firstName: getUserFirstName(selectedOption),
            lastName: getUserLastName(selectedOption),
        }

        setState(state => {
            return {
                ...state,
                editingResult: {
                    ...editingResult,
                    performedBy,
                },
            }
        })
    }

    const onDeleteResultClick = (result: ResultUIItem) => {
        setState((state) => {
            return {
                ...state,
                contestResults: state.contestResults.filter(r => r !== result),
                editingResult: defaultEditingResult,
            };
        });
    }

    const onEditResultClick = (result: ResultUIItem) => {
        selectResultForEditing(result);
    }

    const onUserClick = (userId: number | null) => {
        if (!userId) return;

        navigate(`../users/${userId}`);
    }

    const onSubmitClick = async () => {
        const results = state.contestResults.map(r => {
            const attemptsMs: number[] = getAttemptsMs(r);

            let result = {
                id: r.id,
                roundId: r.roundId,
                attempt1: attemptsMs[0],
                attempt2: attemptsMs[1],
                attempt3: attemptsMs[2],
                attempt4: attemptsMs[3],
                attempt5: attemptsMs[4],
                best: getBestAndAverage(attemptsMs)[0],
                average: getBestAndAverage(attemptsMs)[1],
                performedBy: {
                    id: r.performedBy?.id,
                    firstName: r.performedBy?.firstName,
                    lastName: r.performedBy?.lastName,
                },
            };

            return result;
        });

        const res = await fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/results/${state.contest?.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(results),
        });

        goToContestsList();

        if (!res.ok) {
            setTimeout(() => {
                props.addNotification({ message: 'Произошла ошибка при сохранении результатов. Повторите попытку позже.' });
            }, 0);
        }
    }

    const onGoBackClick = () => {
        goToContestsList();
    }

    const goToContestsList = () => {
        navigate(`../contests${search}`);
    }

    // UI variables
    // valid values: '9.43', '19.43', '1:19.03', '12:19.03', '59:19.03', DNF, DNS
    const isAttemptInputValid = (rawValue: string | null) => {
        if (!rawValue) return false;

        if (rawValue === DNF_DISPLAY_VALUE || rawValue === DNS_DISPLAY_VALUE) return true;

        const containsOnlyAllowed = /^[\d:.S]+$/.test(rawValue);
        const chars: string[] = rawValue.split('');
        const isOrderCorrect = chars.indexOf(':') < chars.indexOf('.');
        const specialCharsCount = chars.filter((c: string) => c === ':' || c === '.').length;
        const delimitedByMinute = rawValue.split(':');

        return containsOnlyAllowed && 
            (specialCharsCount === 1 || specialCharsCount === 2) && 
            isOrderCorrect && 
            // there are exactly 2 signs after dot
            rawValue.split('.')[1].length === 2 && 
            (
                // no minutes
                delimitedByMinute.length === 1 || 
                // if minutes are present, the other criterias should be met
                (
                    delimitedByMinute.length === 2 && 
                    // after minutes there are exactly 5 chars
                    delimitedByMinute[1].length === 5 && 
                    // minutes are 1- or 2-signed
                    (delimitedByMinute[0].length === 1 || delimitedByMinute[0].length === 2)
                )
            );
    };

    const sortResults = (previous: ResultUIItem, next: ResultUIItem) => {
        const avg1 = toMilliseconds(previous.average);
        const avg2 = toMilliseconds(next.average);
        const best1 = toMilliseconds(previous.best);
        const best2 = toMilliseconds(next.best);

        // if both averages are DNF/DNS, sort by bests
        if (avg1 < 0 && avg2 < 0) {
            // if both bests are DNF/DNS, sort by competitor names
            if (best1 < 0 && best2 < 0) {
                return !!previous.performedBy?.id && !!next.performedBy?.id && previous.performedBy?.id > next.performedBy?.id ? 1 : DNF;
            }

            return !!best1 && !!best2 && best1 > best2 ? 1 : DNF;
        }

        return !!avg1 && !!avg2 && avg2 !== DNF && avg2 !== DNS && avg1 > avg2 ? 1 : -1;
    }

    const selectedRoundResults = state.contestResults
        .filter(r => r.roundId === state.selectedRoundId)
        .sort((a, b) => sortResults(a, b));

    const editingResult = state.editingResult;
    
    // TODO add validation messages to the user
    const isEditingResultValid = [
        editingResult.attempt1, 
        editingResult.attempt2,
        editingResult.attempt3,
        editingResult.attempt4,
        editingResult.attempt5,
    ].every(i => isAttemptInputValid(i)) && !!editingResult.performedBy && !!editingResult.performedBy.firstName && !!editingResult.performedBy.lastName && 
        // only one result for a user is allowed
        selectedRoundResults.every(r => r.performedBy?.id !== editingResult.performedBy?.id || r.isEditing || r.performedBy?.id === 0);

    const newResultIsCleared = !editingResult.attempt1 && !editingResult.attempt2 && !editingResult.attempt3 && 
        !editingResult.attempt4 && !editingResult.attempt5 && !editingResult.performedBy?.id;

    const roundHasResults = (roundId: number) => {
        return state.contestResults.some(r => r.roundId === roundId);
    }

    const isTheSameUser = (user1: UserUIItem | null, user2: UserUIItem | null) => {
        if (!user1 || !user2) return false;

        return user1.id === user2.id && user1.firstName === user2.firstName && user1.lastName === user2.lastName;
    }

    // TSX elements
    const getActionIcons = (result: ResultUIItem) => { 
        return (
            <>
                <td className='td-action'> 
                <EditIcon 
                    className={`icon ${result.isEditing && 'editing'}`} 
                    onClick={() => { onEditResultClick(result); }}>
                </EditIcon>
            </td>
            <td className='td-action'> 
                <DeleteForeverIcon 
                    className="icon" 
                    onClick={() => { onDeleteResultClick(result); }}
                ></ DeleteForeverIcon>
            </td>
            </>
        );
    };

    const inputRowCells = !editingResult ? <div>empty</div> :
        <>
            <td></td>
            <td>
                <Autocomplete 
                    allOptions={allUserOptions} 
                    selectedOption={selectedUserOption}
                    optionsNotFoundDisplayName='Пользователь не найден'
                    helperLabelText='Выберите пользователя:'
                    placeholderText='Иван Иванов'
                    allowCreating={true}
                    addNewEntityOptionDisplayName={createNewUserText}
                    nameFormatText={'Введите имя в формате "Иван Иванов"'}
                    isInputValueValid={isUserInputValueValid}
                    onOptionSelect={onCompetitorSelect}
                    onOptionReset={onCompetitorReset}
                >
                </Autocomplete>
            </td>
            <td></td>
            <td></td>
            <td>
                <input
                    className="res-input"
                    type="text"
                    value={state.editingResult.attempt1 ?? ''}
                    onChange={(e) => { onAttemptChange(1, e); }}
                />
            </td>
            <td>
                <input
                    className="res-input"
                    type="text"
                    value={state.editingResult.attempt2 ?? ''}
                    onChange={(e) => { onAttemptChange(2, e); }}
                />
            </td>
            <td>
                <input
                    className="res-input"
                    type="text"
                    value={state.editingResult.attempt3 ?? ''}
                    onChange={(e) => { onAttemptChange(3, e); }}
                />
            </td>
            <td>
                <input
                    className="res-input"
                    type="text"
                    value={state.editingResult.attempt4 ?? ''}
                    onChange={(e) => { onAttemptChange(4, e); }}
                />
            </td>
            <td>
                <input
                    className="res-input"
                    type="text"
                    value={state.editingResult.attempt5 ?? ''}
                    onChange={(e) => { onAttemptChange(5, e); }}
                />
            </td>
            <td>
                {
                    !!editingResult.id || editingResult.isAdded
                        ? <button className='inline-button' disabled={!isEditingResultValid} onClick={onResultSaveClick}>
                            <CheckCircleIcon
                                className={`icon ${!isEditingResultValid && 'disabled'}`}
                                fontSize='small'
                            >
                            </CheckCircleIcon>
                        </button>
                        : <button className='inline-button' disabled={!isEditingResultValid} onClick={onAddResultClick}>
                            <AddCircleIcon 
                                className={`icon ${!isEditingResultValid && 'disabled'}`}
                                fontSize='small' 
                            >
                            </AddCircleIcon>
                        </button> 
                }
            </td>
            <td>
                <CancelIcon
                    className={`icon ${newResultIsCleared && 'disabled'}`}
                    fontSize='small' 
                    onClick={onClearResultClick}
                >
                </CancelIcon>
            </td>
        </>

    const roundTabs =
        <div className='round-tabs'>{
            state.contest?.rounds.map(r => (
                <div 
                    key={r.id}
                    className={`tab ${r.id === state.selectedRoundId && 'active'}`} 
                    onClick={() => onRoundSelect(r.id)}
                >
                {r.name}
                { 
                    props.isEditingMode && 
                    <ErrorIcon className='error-icon' style={{visibility: roundHasResults(r.id) ? 'hidden' : 'visible' }}>
                    </ErrorIcon>
                }
                </div>)
            )}
        </div>

    // TODO create fancy spinner
    if (status === EditResultsPageStatus.Loading) return <Loading></Loading>;

    // check for contest to get rid of '?' sign in the main markup
    if (!state.contest || [EditResultsPageStatus.Error, EditResultsPageStatus.ContestNotFound].find(s => s === status)) 
        return <ContestNotFound></ContestNotFound>

    else return (
        <>
            <div className='container info-container full-width-scrollable-container'>
                {state.contest.name} { props.isEditingMode ? ' - ввод результатов' : ' - результаты' }
            </div>
            {roundTabs}

            <div className='results-container'>
                <table className='results-table'>
                    <thead>
                        <tr>
                            <th>Место</th>
                            <th style={{width: '30%'}}>Участник</th>
                            <th>Лучшая</th>
                            <th>Среднее</th>
                            <th colSpan={5} style={{width: '370px'}}>Сборки</th>
                            { isEditingMode && <th colSpan={2} style={{width: '100px'}}></th>}
                        </tr>
                    </thead>

                    <tbody>
                        {selectedRoundResults.map((r, i) => {
                            return (
                                <tr key={i}>
                                    <td className='td-order'>{++i}</td>
                                    <td className='td-name' onClick={() => onUserClick(r.performedBy?.id ?? null)}>
                                        <p className='user-name'>
                                            {
                                                r.performedBy && getUserDisplayName(r.performedBy)
                                            }
                                        </p>
                                    </td>
                                    <td className='td-res'>{r.best}</td>
                                    <td className='td-res'>{r.average}</td>
                                    <td className='td-res'>{r.attempt1}</td>
                                    <td className='td-res'>{r.attempt2}</td>
                                    <td className='td-res'>{r.attempt3}</td>
                                    <td className='td-res'>{r.attempt4}</td>
                                    <td className='td-res'>{r.attempt5}</td>
                                    { isEditingMode && getActionIcons(r) }
                                </tr>
                            )
                        })}
                        {isEditingMode && <>
                            <tr></tr>
                            <tr className='input-row'>
                                {inputRowCells}
                            </tr>
                        </>}
                    </tbody>
                </table>

                <div className="actions-container">
                    <FormButton onClick={onGoBackClick} disabled={false} text="Назад к списку"></FormButton>
                   {
                        isEditingMode && 
                        <FormButton 
                            disabled={state.contest.rounds.some(r => !roundHasResults(r.id))} 
                            text="Сохранить результаты"
                            onClick={onSubmitClick}></FormButton>
                    }
                </div>
            </div>
        </>
    )
}

export default EditResults;