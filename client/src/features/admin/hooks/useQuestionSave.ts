import { useState } from "react";
import { useUpdateSessionQuestionsMutation } from "../services/admin.Api";

export const useQuestionSave = () => {
  const [updateSessionQuestions, { isLoading: isSaving }] =
    useUpdateSessionQuestionsMutation();
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveQuestions = async (questionIds: string[]) => {
    setSaveError(null);
    try {
      await updateSessionQuestions({ questions: questionIds }).unwrap();
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || "Failed to save session questions";
      setSaveError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    saveError,
    isSaving,
    saveQuestions,
    setSaveError,
  };
};
