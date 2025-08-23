import React, { useEffect } from "react";
import { useFetchAllQuestionsQuery } from "../services/questions.api";
import Loader from "../../../components/ui/Loader";
import ErrorLayout from "../../../components/ui/Error";
import QuestionnaireScreen from "../components/QuestionnaireScreen";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { setCurrentStep, setTotalSteps } from "../../game/services/gameSlice";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { RootState } from "../../../app/store";

const Questionnaire: React.FC = () => {
  const { data: questions, isError, isLoading } = useFetchAllQuestionsQuery({});
  const dispatch = useAppDispatch();
  const { questionIndex } = useParams<{ questionIndex: string }>();
  const isGameStarted = useAppSelector(
    (state: RootState) => state.game.isGameStarted
  );
  const GameCompleted = useAppSelector(
    (state: RootState) => state.gameArena.gameCompleted
  );
  const { sessionId } = useAppSelector((state: RootState) => state.game);
  const navigate = useNavigate();
  const STORAGE_KEY = `questionnaire_answers_${sessionId}`;
  const parsedAnswers = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  useEffect(() => {
    if (questions && questions.length > 0) {
      dispatch(setCurrentStep(0));
      dispatch(setTotalSteps(questions.length - 1));
    }
  }, [questions, dispatch]);

  useEffect(() => {
    if (GameCompleted) {
      navigate(`/game/${sessionId}/completion`, { replace: true });
    } else if (isGameStarted) {
      navigate(`/game/${sessionId}/arena`, { replace: true });
    }
  }, [GameCompleted, isGameStarted, navigate, sessionId]);

  if (isLoading) {
    return <Loader />;
  }
  if (isError || !questions || questions.length === 0) {
    return <ErrorLayout />;
  }

  // If no question index is provided, redirect to first question
  if (!questionIndex && questions && questions.length > 0) {
    return <Navigate to={`/game/${sessionId}/questionnaire/0`} replace />;
  }
  if (parsedAnswers.length === questions.length) {
    return <Navigate to={`/game/${sessionId}/waiting`} replace />;
  }

  return (
    <QuestionnaireScreen
      questions={questions}
      sessionId={sessionId || ""}
      initialQuestionIndex={questionIndex ? parseInt(questionIndex, 10) : 0}
    />
  );
};

export default Questionnaire;
