import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useFetchCurrentQuestionQuery } from "../../question/services/questions.api";
import Loader from "../../../components/ui/Loader";
import Error from "../../../components/ui/Error";
import normalBg from "../../../assets/background/question_bg.webp";
import SmartMedia from "../../../components/ui/SmartMedia";

interface AnswerRevealPageProps {
  presenterMode?: boolean;
}

const AnswerRevealPage: React.FC<AnswerRevealPageProps> = ({
  presenterMode = false,
}) => {
  const {
    data: questionData,
    isLoading,
    error,
    refetch,
  } = useFetchCurrentQuestionQuery();
  const question = questionData?.data?.question;

  // Since this page only renders when the game is IDLE, force a refetch
  // to grab the newly un-hidden answer assets from the backend
  useEffect(() => {
    refetch();
  }, [refetch]);

  if (isLoading) return <Loader />;
  if (error || !question) return <Error />;

  // Render media arrays helpers
  const renderMediaList = (mediaArray?: any[]) => {
    if (!mediaArray || !Array.isArray(mediaArray)) return null;
    return mediaArray.map((media, idx) => {
      if (media.type === "text") {
        return (
          <Typography
            key={`answer-reveal-text-${idx}`}
            variant="body2"
            sx={{ textAlign: "center", color: "#475569", mb: 2 }}
          >
            {media.text}
          </Typography>
        );
      }

      return (
        <SmartMedia
          key={`answer-reveal-media-${idx}`}
          media={media}
          alt={media.name || "Media"}
          sx={{
            width: "100%",
            maxHeight: presenterMode ? "520px" : "250px",
            objectFit: "contain",
            borderRadius: "12px",
            mb: 2,
          }}
          audioSx={{ width: "100%", mb: 2 }}
          iframeSx={{
            minHeight: presenterMode ? 520 : 320,
            mb: 2,
          }}
        />
      );
    });
  };

  const fallbackAssetText = question.questionAssets?.find(
    (a) => a.type === "text",
  )?.text;
  const answerText =
    question.answerContent?.text ||
    fallbackAssetText ||
    question.options?.find((o: any) => o.optionId === question.correctAnswer)
      ?.optionText ||
    "(Verbal Answer)";
  const questionText =
    question.questionContent?.text || question.questionText || "";

  const answerMediaToRender = question.answerContent?.media?.length
    ? question.answerContent.media
    : question.questionAssets;

  return (
    <Box
      sx={{
        width: "100%",
        flex: "1 0 auto",
        minHeight: "100%",
        background: "linear-gradient(180deg, #87CEEB 0%, #4682B4 100%)",
        backgroundImage: `url(${normalBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: presenterMode ? "12px" : "24px",
      }}
    >
      <Box
        sx={{
          backgroundColor: "primary.light",
          borderRadius: "20px",
          padding: presenterMode ? "18px" : "24px",
          width: "100%",
          maxWidth: presenterMode ? "1100px" : "400px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          marginBottom: presenterMode ? "12px" : "32px",
          textAlign: "center",
          mt: presenterMode ? 0 : 4,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: "primary.main",
            fontWeight: "bold",
            mb: 2,
            fontSize: presenterMode ? "34px" : undefined,
          }}
        >
          Correct Answer
        </Typography>

        <Typography
          variant="h4"
          sx={{
            color: "#333",
            fontWeight: "bold",
            mb: 2,
            fontSize: presenterMode ? "44px" : undefined,
          }}
        >
          {answerText}
        </Typography>

        {renderMediaList(answerMediaToRender)}

        <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
          <Typography
            variant="subtitle1"
            sx={{ color: "#666", mb: 2, fontWeight: "bold" }}
          >
            Question Recap
          </Typography>
          <Typography variant="body1" sx={{ color: "#666", mb: 2 }}>
            {questionText}
          </Typography>

          {renderMediaList(question.questionContent?.media)}

          {/* Fallback for legacy fields */}
          {!question.questionContent?.media?.length &&
            question.questionImage && (
              <Box
                component="img"
                src={question.questionImage}
                alt="Question"
                sx={{
                  width: "100%",
                  maxHeight: presenterMode ? "520px" : "250px",
                  objectFit: "contain",
                  borderRadius: "12px",
                  mb: 2,
                }}
              />
            )}

          {!question.questionContent?.media?.length &&
            question.quetionVideo && (
            <Box
              component="video"
              src={question.quetionVideo}
              controls
              playsInline
              preload="metadata"
              sx={{
                width: "100%",
                maxHeight: presenterMode ? "520px" : "250px",
                borderRadius: "12px",
                  mb: 2,
                }}
              />
            )}
        </Box>
      </Box>
    </Box>
  );
};

export default AnswerRevealPage;
