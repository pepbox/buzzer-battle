import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  QuestionBankItem,
  useFetchQuestionBankQuery,
  useFetchQuestionFoldersQuery,
  useUpdateSessionQuestionsMutation,
} from "../services/admin.Api";
import { useFetchSessionQuery } from "../../session/services/session.api";
import CurrentQuestionsModal from "../components/CurrentQuestionsModal";
import QuestionEditorDialog from "../components/QuestionEditorDialog";
import QuestionLibraryManager from "../components/QuestionLibraryManager";

const QuestionLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [currentListModalOpen, setCurrentListModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<QuestionBankItem | null>(null);
  const [updateSessionQuestions] = useUpdateSessionQuestionsMutation();

  const { data: sessionResponse } = useFetchSessionQuery();
  const { data: foldersResponse } = useFetchQuestionFoldersQuery();
  const { data: allQuestionsResponse } = useFetchQuestionBankQuery({
    sort: "newest",
    page: 1,
    limit: 500,
  });

  const selectedQuestionIds = sessionResponse?.data?.questions || [];

  const questionLookup = useMemo(() => {
    const map = new Map<string, QuestionBankItem>();
    (allQuestionsResponse?.data?.questions || []).forEach((question) => {
      map.set(question._id, question);
    });
    return map;
  }, [allQuestionsResponse]);

  const folders = useMemo(() => {
    const apiFolders = foldersResponse?.data?.folders || [];
    return ["General", ...apiFolders.filter((folder) => folder !== "General")];
  }, [foldersResponse]);

  return (
    <>
      <QuestionLibraryManager
        showBackButton
        showCurrentListButton
        onBack={() => navigate(`/admin/${sessionId}/dashboard`)}
        onOpenCurrentList={() => setCurrentListModalOpen(true)}
        onQuestionsSaved={() => navigate(`/admin/${sessionId}/dashboard`)}
      />

      <CurrentQuestionsModal
        open={currentListModalOpen}
        onClose={() => setCurrentListModalOpen(false)}
        selectedQuestionIds={selectedQuestionIds}
        questionLookup={questionLookup}
        onSave={async (questionIds) => {
          await updateSessionQuestions({ questions: questionIds }).unwrap();
          setCurrentListModalOpen(false);
        }}
        onEdit={(question) => {
          setEditingQuestion(question);
          setCurrentListModalOpen(false);
        }}
      />

      <QuestionEditorDialog
        open={Boolean(editingQuestion)}
        onClose={() => setEditingQuestion(null)}
        folders={folders}
        defaultFolder={editingQuestion?.folder || "General"}
        mode="edit"
        initialQuestion={editingQuestion}
        onSaved={() => {}}
      />
    </>
  );
};

export default QuestionLibraryPage;
