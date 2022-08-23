import { useLocation, useNavigate } from "react-router-dom";
import FormButton from "./FormButton";

const ContestNotFound = () => {
    const navigate = useNavigate();
    const { search } = useLocation();

    return  (
        <>
            <span style={{marginBottom: '20px'}}>Контест не найден</span>
            <FormButton onClick={() => { navigate(`../contests${search}`); }} disabled={false} text="Назад к списку"></FormButton>
        </>
    );
}

export default ContestNotFound;
