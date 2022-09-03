import { TextField } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import moment from "moment";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { HttpResponseStatusCode } from "../enums";
import { City, ErrorHandlerProps, RoundFormat, User } from "../models/state";
import "./EditContestForm.scss";
import Autocomplete, { AutocompleteOption } from "./shared/Autocomplete";
import ContestNotFound from "./shared/ContestNotFound";
import FormButton from "./shared/FormButton";
import Loading from "./shared/Loading";

type RoundItem = {
    name: string,
    format: RoundFormat,
}

type ContestFormState = {
    name: string,
    date: Date,
    vkLink: string,
    organizedById: number | null,
    cityId: number | null,
    rounds: RoundItem[],
    allUserOptions: AutocompleteOption[],
    allCityOptions: AutocompleteOption[],
}

enum EditContestPageStatus {
    Idle,
    Loading,
    Loaded,
    ContestNotFound,
    Error,
}

// TODO
// test date locales
// add other events, 4x4, 5x5 etc
// add loading indicator
const EditContestForm = (props: ErrorHandlerProps) => {
    let navigate = useNavigate();
    const { id: contestId } = useParams();
    const { search } = useLocation();
    const contestIdNum =  Number(contestId);
    const isAddNewMode = contestIdNum === 0;

    const availableRounds: RoundItem[] = [
        { name: '3x3 финал', format: RoundFormat.AVERAGE_OF_5 },
        { name: '3x3 полуфинал', format: RoundFormat.AVERAGE_OF_5  },
        { name: '3x3 первый раунд', format: RoundFormat.AVERAGE_OF_5  },
    ];

    const [ formState, setFormState ] = useState<ContestFormState>({
        name: '',
        date: new Date(),
        vkLink: '',
        organizedById: null,
        cityId: null,
        rounds: [availableRounds[0]],
        allUserOptions: [],
        allCityOptions: [],
    });

    const [ selectedUserOption, setSelectedUserOption ] = useState<AutocompleteOption | null>(null);
    const [ selectedCityOption, setSelectedCityOption ] = useState<AutocompleteOption | null>(null);
    const [ status, setStatus ] = useState<EditContestPageStatus>(EditContestPageStatus.Idle);
    const { addNotification } = props;

    useEffect(() => {
        if (isNaN(contestIdNum) || contestIdNum < 0) {
            addNotification({ message: 'Произошла ошибка при загрузке контеста. Повторите попытку позже.' });
            setStatus(EditContestPageStatus.Error);

            return;
        }

        setStatus(EditContestPageStatus.Loading);

        const getContestInfo = isAddNewMode 
            ? Promise.resolve(null)
            : fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/contests/${contestIdNum}`, 
            {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
            });
        
        const getUsers = fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/users`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        });
        
        const getCities = fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/cities`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
        });

        // TODO refactor - when there are too many users, it will slow down the app. Do not load all users at once
        Promise.all([getContestInfo, getUsers, getCities])
            .then(responses => {
                const failedResponse = responses.find(r => r && r.status !== HttpResponseStatusCode.OK && r.status !== HttpResponseStatusCode.NoContent);
                if (failedResponse)
                    throw new Error(failedResponse.status.toString());

                if (responses.find(r => !!r && r.status === HttpResponseStatusCode.NoContent))
                    throw new Error(HttpResponseStatusCode.NoContent.toString());

                return Promise.all(responses.map(res => !res ? Promise.resolve(null) : res.json()));
            })
            .then(([contestInfo, users, cities]) => {
                const allUserOptions = users.map((u: User) => {
                    return new AutocompleteOption(u.id, getUserDisplayName(u), false);
                });
                const allCityOptions = cities.map((c: City) => {
                    return new AutocompleteOption(c.id, c.name);
                });

                if (isAddNewMode) {
                    setFormState((state) => {
                        return {
                            ...state,
                            allUserOptions,
                            allCityOptions,
                        }
                    });

                    setStatus(EditContestPageStatus.Loaded);

                    return;
                }

                // populate form with contest data
                setFormState({
                    name: contestInfo.name,
                    date: contestInfo.date,
                    vkLink: contestInfo.vkUrl,
                    organizedById: contestInfo.organizedById,
                    cityId: contestInfo.cityId,
                    rounds: contestInfo.rounds,
                    allUserOptions,
                    allCityOptions,
                });

                // preselect organizer autocomplete with contest data
                setSelectedUserOption(new AutocompleteOption(contestInfo.organizedById, getUserDisplayName(users.find((u: User) => u.id === contestInfo.organizedById)), false))

                // preselect city autocomplete with contest data
                const city = cities.find((c: City) => c.id === contestInfo.cityId);
                setSelectedCityOption(new AutocompleteOption(city.id, city.name));

                setStatus(EditContestPageStatus.Loaded);
            })
            .catch((err) => {
                if (err.message === HttpResponseStatusCode.NoContent.toString()) {
                    // do not show notification for empty response
                    setStatus(EditContestPageStatus.ContestNotFound);
                    return;
                }

                setStatus(EditContestPageStatus.Error);
                addNotification({ message: 'Произошла ошибка при загрузке контеста. Повторите попытку позже.' });
            })
    }, [contestIdNum, isAddNewMode, addNotification]);

    const onOrganizerSelect = (userOption: AutocompleteOption) => {
        setSelectedUserOption(userOption);
        setFormState(state => {
            return {
                ...state,
                organizedById: userOption.id,
            }
        });
    }

    const onOrganizerReset = () => {
        setSelectedUserOption(null);
        setFormState(state => {
            return {
                ...state,
                organizedById: null,
            }
        });
    }
    const onCitySelect = (cityOption: any) => {
        setSelectedCityOption(cityOption);
        setFormState(state => {
            return {
                ...state,
                cityId: cityOption.id,
            }
        });
    }

    const onCityReset = () => {
        setSelectedCityOption(null);
        setFormState(state => {
            return {
                ...state,
                cityId: null,
            }
        });
    }

    const getUserDisplayName = (user: User): string => {
        return `${user.firstName} ${user.lastName}`;
    }

    const onSubmitButtonClick = async () => {
        setStatus(EditContestPageStatus.Loading)

        const formData = {
            "name": formState.name,
            "vkUrl": formState.vkLink,
            "date": formState.date,
            "rounds": formState.rounds,
            "organizedById": formState.organizedById,
            "cityId": formState.cityId,
        };

        const response = contestIdNum === 0
            ? await fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/contests/`,
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formData),
            })
            : await fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/contests/${contestId}`,
            {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formData),
            });

            goToContestsList();

            // hack to prevent clearing the notifications after url change
            if (!response.ok) {
                setTimeout(() => {
                    props.addNotification({ message: 'Произошла ошибка при сохранении контеста. Повторите попытку позже.' });
                }, 0);
            }
        }

    const addNewRound = () => {
        const addedRounds = formState.rounds;
        const newRounds = [ availableRounds[addedRounds.length], ...addedRounds ];

        setFormState({
            ...formState,
            rounds: newRounds,
        })
    }

    const removeRound = () => {
        const newRounds = [...formState.rounds];
        newRounds.shift();

        setFormState({
            ...formState,
            rounds: newRounds,
        });
    }

    const isFormValid = () => {
        return formState.cityId !== null && !!formState.name && formState.organizedById !== null;
    }

    const goToContestsList = () => {
        navigate(`../contests${search}`);
    }

    const roundItems = formState.rounds?.map(r => {
        return (
            <tr key={r.name} className="round-row">
                <td> </td>
                <td>
                    {r.name}
                </td>
                {/* TODO add different round formats     */}
                {/* <td>
                    <div>
                        <input
                            id="r1"
                            type="radio"
                            name={r.name}
                            checked={r.type === RoundType.AVERAGE_OF_5}
                            onChange={() => setRoundType(r, RoundType.AVERAGE_OF_5)}
                        />
                        <label htmlFor="r1"> среднее из 5</label>
                    </div>
                </td>
                <td>
                    <div>
                        <input
                            type="radio"
                            disabled={true}
                            name={r.name}
                            id="r1"
                            checked={r.type === RoundType.MEAN_OF_3}
                            onChange={() => setRoundType(r, RoundType.MEAN_OF_3)}
                        />
                        <label htmlFor="r1"> среднее из 3</label>
                    </div>
                </td>
                <td className="empty"></td> */}
            </tr>
        )
    });

    return (
        <>
            {
                status === EditContestPageStatus.Loading && <Loading></Loading>
            }
            {
                [ EditContestPageStatus.ContestNotFound, EditContestPageStatus.Error ].find(s => s === status) && <ContestNotFound></ContestNotFound>
            }
            {
                status === EditContestPageStatus.Loaded &&
                <>
                    <div className="info-container">
                        {contestIdNum === 0 ? 'Создание нового контеста' : formState.name + ' - Редактирование контеста'}
                    </div>
                    <div inline-datepicker="true" data-date="02/25/2022"></div>
                    <div className="create-contest-form">
                        <table className="main-info-table">
                            <tbody>
                                <tr>
                                    <td>
                                        <label>Организатор *</label>
                                    </td>
                                    <td>
                                        <Autocomplete 
                                            allOptions={formState.allUserOptions} 
                                            selectedOption={selectedUserOption}
                                            optionsNotFoundDisplayName='Пользователь не найден'
                                            helperLabelText='Выберите пользователя:'
                                            placeholderText='Иван Иванов'
                                            allowCreating={false}
                                            onOptionSelect={onOrganizerSelect}
                                            onOptionReset={onOrganizerReset}
                                        >
                                        </Autocomplete>
                                    </td>
                                    <td>
                                        <label>Дата проведения</label>
                                    </td>
                                    <td>
                                        <LocalizationProvider dateAdapter={AdapterMoment}>
                                            <DatePicker
                                                shouldDisableDate={(date: moment.Moment) => {
                                                    // disable previous days, but allow today
                                                    const today = moment().toDate();
                                                    today.setHours(0);
                                                    today.setMinutes(0);
                                                    today.setSeconds(0);
                                                    today.setMilliseconds(0);

                                                    const calendarDate = date.toDate();
                                                    calendarDate.setHours(0);
                                                    calendarDate.setMinutes(0);
                                                    calendarDate.setSeconds(0);
                                                    calendarDate.setMilliseconds(0);

                                                    return calendarDate < today;
                                                }}
                                                value={formState.date}
                                                onChange={(date: any) => {
                                                    setFormState({ ...formState, date: (date.toDate()) })
                                                }}
                                                renderInput={(params) => <TextField {...params} />}
                                            />
                                        </LocalizationProvider>
                                    </td>
                                </tr>
                                <tr className="empty"></tr>
                                <tr>
                                    <td>
                                        <label id="name-label" htmlFor="name-input">Название *</label>
                                    </td>
                                    <td>
                                        <input
                                            id="city-input"
                                            type="text"
                                            value={formState.name}
                                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                        />
                                    </td>
                                </tr>
                                <tr className="empty"></tr>
                                <tr>
                                    <td>
                                        <label htmlFor="vk-input">Ссылка VK</label>
                                    </td>
                                    <td>
                                        <input
                                            id="vk-input"
                                            type="text"
                                            value={formState.vkLink}
                                            onChange={(e) => setFormState({ ...formState, vkLink: e.target.value })}
                                        />
                                    </td>
                                    <td>
                                        <label htmlFor="city-input">Город *</label>
                                    </td>

                                    <td>
                                        <Autocomplete 
                                            allOptions={formState.allCityOptions} 
                                            selectedOption={selectedCityOption}
                                            optionsNotFoundDisplayName='Город не найден'
                                            helperLabelText="Выберите город"
                                            placeholderText="Казань"
                                            allowCreating={false}
                                            onOptionSelect={onCitySelect}
                                            onOptionReset={onCityReset}
                                        >
                                        </Autocomplete>
                                    </td>
                                </tr>
                                <tr className="empty"></tr>
                            </tbody>
                        </table>

                        <div className="events-container">
                            <div className="events-label">Дисциплины</div>
                            <div className="events-list">
                                <div className="event">
                                    <div className="event-name">
                                        3x3
                                    </div>
                                    <div className="event-rounds">
                                        раунды ({formState.rounds.length})
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounds-header">
                            <div className="add-round-btn">
                                Раунды 3х3
                            </div>
                            <div>
                                <button className="round-btn" onClick={addNewRound} disabled={formState.rounds.length === 3}>
                                    +
                                </button>
                            </div>
                            <div>
                                <button className="round-btn" onClick={removeRound} disabled={formState.rounds.length === 1}>
                                    -
                                </button>
                            </div>
                        </div>

                        <table className="rounds-table">
                            <tbody>
                                <tr className="empty"></tr>
                                {roundItems}
                            </tbody>
                        </table>

                        <div className="actions-container">
                            <FormButton onClick={goToContestsList} disabled={false} text="Назад к списку"></FormButton>
                            <FormButton onClick={async () => { await onSubmitButtonClick(); }} disabled={!isFormValid()} text="Сохранить"></FormButton>
                        </div>
                    </div>
                </>
            }
        </>
    );
}

export default EditContestForm;
