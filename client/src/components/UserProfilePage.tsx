import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HttpResponseStatusCode } from "../enums";
import { ErrorHandlerProps, Result, User } from "../models/state";
import { handleResponses } from "../services/http-response.service";
import { toDelimitedString } from "../services/results.helper";
import Loading from "./shared/Loading";
import UserNotFound from "./shared/UserNotFound";
import './UserProfilePage.scss';

type UserProfilePageState = {
    user: User | null,
    contestsCount: number,
    solvesCount: number,
    allResults: ProfileResult[],
}

type ProfileResult = Result & {
    contestId: number,
    contestName: string,
    roundName: string,
};

enum UserProfilePageStatus {
    Idle,
    Loading,
    Loaded,
    UserNotFound,
    Error,
}

// TODO add records tab
// TODO add place in round value
const UserProfilePage = (props: ErrorHandlerProps) => {
    const navigate = useNavigate();
    const { id: userId } = useParams();
    const [ state, setState ] = useState<UserProfilePageState>({
        user: null,
        contestsCount: 0,
        solvesCount: 0,
        allResults: [],
    });
    const [ status, setStatus ] = useState<UserProfilePageStatus>(UserProfilePageStatus.Idle);
    const addNotification = props.addNotification;

    useEffect(() => {
        const baseUrl = `${process.env.REACT_APP_BACKEND_SERVER_URL}/users`;

        const getUser = fetch(`${baseUrl}/${userId}/profile`);
        const getContestsCount = fetch(`${baseUrl}/${userId}/contests-count`);
        const getAllResults = fetch(`${baseUrl}/${userId}/all-results`);

        setStatus(UserProfilePageStatus.Loading);

        Promise.all([ getUser, getContestsCount, getAllResults ])
            .then(responses => {
                handleResponses(responses);

                return Promise.all(responses.map(r => r.json()));
            })
            .then((res) => {
                const user = res[0];
                const contestsCount = res[1];
                const allResultsInfo = res[2];

                setState(() => {
                    return {
                        user,
                        contestsCount,
                        solvesCount: allResultsInfo.totalSolvesCount,
                        allResults: allResultsInfo.allResults,
                    };
                });
                setStatus(UserProfilePageStatus.Loaded);
            })
            .catch((err) => {
                if (err.message === HttpResponseStatusCode.NoContent.toString()) {
                    // do not show notification for empty response
                    setStatus(UserProfilePageStatus.UserNotFound);
                    return;
                }

                setStatus(UserProfilePageStatus.Error);
                addNotification({ message: 'Произошла ошибка при загрузке пользователя. Повторите попытку позже.' });
            })
    }, [userId, addNotification]);

    const onContestClick = (contestId: number) => {
        navigate(`../contests/${contestId}/results`);
    }

    if (status === UserProfilePageStatus.Loading) return <Loading></Loading>;

    // check for contest to get rid of '?' sign in the main markup
    if (!state.user || [UserProfilePageStatus.Error, UserProfilePageStatus.UserNotFound].find(s => s === status)) 
        return <UserNotFound></UserNotFound>

    return (
        <div className="user-profile-page">
            <div className="container main-info">
                <h2>
                    { `${state.user.firstName} ${state.user.lastName}`}
                </h2>

                <div className="info-row">
                    <div className="info-item">
                        <h3>
                            Город
                        </h3>
                        <div className="info-text">{state.user.city.name}</div>
                    </div>

                    <div className="info-item">
                        <h3>
                            Посетил встреч
                        </h3>
                        <div className="info-number">{state.contestsCount}</div>
                    </div>

                    <div className="info-item">
                        <h3>
                            Всего сборок
                        </h3>
                        <div className="info-number">{state.solvesCount}</div>
                    </div>
                </div>
            </div>

            <div className="container results-info">
                <h3>Все результаты</h3>

                <table className="results-table">
                    <thead>
                        <tr>
                            <th className="th-contest">Встреча</th>
                            <th className="th-round">Раунд</th>
                            <th>Лучшая</th>
                            <th>Средняя</th>
                            <th colSpan={5}>Попытки</th>
                        </tr>
                    </thead>

                    <tbody>
                        {state.allResults.map(r => {
                            return (
                                <tr key={r.id}>
                                    <td className="td-contest" onClick={() => onContestClick(r.contestId)}>{r.contestName}</td>
                                    <td className="td-round">{r.roundName}</td>
                                    <td>{toDelimitedString(r.best)}</td>
                                    <td>{toDelimitedString(r.average)}</td>
                                    <td>{toDelimitedString(r.attempt1)}</td>
                                    <td>{toDelimitedString(r.attempt2)}</td>
                                    <td>{toDelimitedString(r.attempt3)}</td>
                                    <td>{toDelimitedString(r.attempt4)}</td>
                                    <td>{toDelimitedString(r.attempt5)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
};

export default UserProfilePage;