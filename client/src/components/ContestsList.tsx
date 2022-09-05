import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Contest, ContestStatus, ErrorHandlerProps } from "../models/state";
import './ContestsList.scss';
import EditIcon from '@mui/icons-material/Edit';
import FormButton from './shared/FormButton';
import CampaignIcon from '@mui/icons-material/Campaign';
import Loading from './shared/Loading';

type ContestsListState = {
    allContests: Contest[],
    showUpcoming: boolean,
}

enum ContestListPageStatus {
    Idle,
    Loading,
    Error,
    Loaded,
}

const ContestList = (props: ErrorHandlerProps) => {
    const monthsAbbreviations = [ 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек' ];
    
    const navigate = useNavigate();
    const [ params ] = useSearchParams();
    const { search } = useLocation();

    const isAdmin: boolean = params.get('isAdmin') === 'true';
    const showUpcoming: boolean = params.get('showUpcoming') === 'true';

    const [ pageStatus, setPageStatus ] = useState<ContestListPageStatus>(ContestListPageStatus.Idle);
    const [ state, setState ] = useState<ContestsListState>({ 
        allContests: [],
        showUpcoming,
    });

    const addNotification = props.addNotification;

    // initial loading of contests
    useEffect(() => {
        setPageStatus(ContestListPageStatus.Loading);

        fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/contests`)
            .then((response: Response) => {

                if (!response.ok) {
                    throw new Error(response.statusText);
                }

                return response.json();
            })
            .then((contests) => {
                contests = contests.map((c: any) => {
                    c.date = new Date(c.date);
                    
                    return c;
                });

                setPageStatus(ContestListPageStatus.Loaded);
                setState((state) => {
                    return {
                        ...state,
                        allContests: contests,
                    };
                });
            })
            .catch(() => {
                setPageStatus(ContestListPageStatus.Error);
                addNotification({ message: 'Произошла ошибка при загрузке контестов. Повторите попытку позже.' });
            });
    }, [addNotification])  

    // stringifies the date object into a human readable format
    const getReadableDate = (date: Date) => {
        return `${ monthsAbbreviations[new Date(date).getMonth()]} ${date.getDate()}, ${date.getFullYear()  }`;
    } 

    // TODO add other events besides 3x3
    const getEventItems = (contest: Contest) => {
        return (
            <div className="event-container">
                3x3
            </div>
        );
    }

    const onEditContestClick = (event: any, contestId: number) => {
        event.stopPropagation();

        navigate(`./${contestId}/edit${search}`);
    }

    // TODO refactor navigation - move showUpcoming, isAdmin to the redux state
    const onContestItemClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, contest: Contest) => {
        event.stopPropagation();

        const pageUrl = isAdmin && contest.status !== ContestStatus.PUBLISHED
            ? 'edit-results'
            : 'results';

        navigate(`./${contest.id}/${pageUrl}${search}`);
    }

    const onDeleteContestClick = async (event: React.MouseEvent<SVGSVGElement, MouseEvent>, contestId: number) => {
        event.stopPropagation();

        const itemsBeforeDelete = state.allContests;

        setPageStatus(ContestListPageStatus.Loading);

        const response = await fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/contests/${contestId}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
        });

        setPageStatus(ContestListPageStatus.Loaded);

        if (!response.ok) {
            addNotification({ message: 'Произошла ошибка при удалении контеста. Повторите попытку позже.' });

            return;
        };

        setState(state => {
            return {
                ...state,
                allContests: itemsBeforeDelete.filter(c => c.id !== contestId),
            };
        });
    }

    const toggleContestTab = (showUpcoming: boolean) => {
        // TODO ad helper methods to construct query params from an object
        navigate({
            search: `?showUpcoming=${showUpcoming}${isAdmin ? '&isAdmin=true' : ''}`
        });

        setState(state => {
            return {
                ...state,
                showUpcoming,
            };
        });
    }

    const onPublishContestClick = async (event: any, contestId: number) => {
        event.stopPropagation();

        const contest = state.allContests.find(c => c.id === contestId);
        
        if (!contest) {
            addNotification({ message: 'Произошла ошибка при загрузке контестов. Повторите попытку позже.' });
            throw new Error(`Контест с id = ${contestId} не найден.`);
        }
               
        setPageStatus(ContestListPageStatus.Loading);

        const response = await fetch(`${process.env.REACT_APP_BACKEND_SERVER_URL}/contests/${contestId}/publish`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
        });

        setPageStatus(ContestListPageStatus.Loaded);

        if (!response.ok) {
            addNotification({ message: 'Произошла ошибка при загрузке контестов. Повторите попытку позже.' });

            return;
        }

        setState(state => {
            return {
                ...state,
                allContests: state.allContests.map(c => {
                    if (c.id !== contestId) return c;

                    c.status = ContestStatus.PUBLISHED;
                    return c;
                })
            }
        });
    }

    const getActions = (c: Contest) => {
        if (c.status === ContestStatus.PUBLISHED || !isAdmin) return null;

        return (
            <>
                <button className='action-button' disabled={c.status === ContestStatus.NEW} onClick={(e) => onPublishContestClick(e, c.id) }>  
                    <CampaignIcon 
                        className="action-icon" 
                    >
                    </CampaignIcon>
                </button>

                <button className='action-button'>
                    <EditIcon className="action-icon" onClick={(e) => { onEditContestClick(e, c.id); }}></EditIcon>
                </button>

                <button className='action-button'>
                    <DeleteForeverIcon className="action-icon" onClick={(e) => { onDeleteContestClick(e, c.id); }}></ DeleteForeverIcon>
                </button>
            </>
        );
    }

    const getMainInfo = (c: Contest) => {
        return (
            <>
                <p>{c.name}</p>
                <p>{getReadableDate(new Date(c.date))}</p>
                <p>{c.city.name}</p>
                {c.organizedBy ? <p>{c.organizedBy.firstName + ' ' + c.organizedBy.lastName}</p> : null}
            </>
        );
    }

    const getContestItem = (c: Contest) => {
        return (
            <div className="list-item" key={c.id} onClick={(e) => onContestItemClick(e, c) }>
                <div className="actions-menu actions-menu-left">
                </div>
                <div className="contest-preview" key={c.name}>
                    <div className="main-info">
                        {getMainInfo(c)}
                    </div>
                    <hr />
                    <div className="additional-info">
                        {getEventItems(c)}
                    </div>
                </div>
                <div className="actions-menu actions-menu-right">
                    { getActions(c) }
                </div>
            </div>
        );
    }

    const validStatuses = state.showUpcoming 
        ? [ContestStatus.NEW, ContestStatus.EDITING_RESULTS] 
        : [ContestStatus.PUBLISHED];

    const displayedContests = state.allContests.filter(c => validStatuses.some(s => c.status === s));

    return (
        <>
            <div className="tabs">
                <h2 className={state.showUpcoming ? '' : 'active'} onClick={() => { toggleContestTab(false) } }>Прошедшие</h2>
                <h2 className={state.showUpcoming ? 'active' : ''} onClick={() => { toggleContestTab(true) } }>Предстоящие</h2>
            </div>

            {
                pageStatus === ContestListPageStatus.Loading && <Loading></Loading>
            }
            {
                pageStatus === ContestListPageStatus.Loaded && 
                <>
                    <div className="list-container">
                        {
                            displayedContests.length
                                ? displayedContests.map(c =>  getContestItem(c))
                                : <>Нет {state.showUpcoming ? ' предстоящих' : 'прошедших'} контестов</>
                        }
                    </div>
                    {
                        isAdmin && 
                        <div className="actions-container">
                            <FormButton onClick={() => { navigate(`./0/edit${search}`)}} disabled={false} text="Создать контест"></FormButton>
                        </div>
                    }
                </>
            }
        </>
    )
}

export default ContestList;
