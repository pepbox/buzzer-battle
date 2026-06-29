import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  QuestionBankItem,
  useFetchQuestionFoldersQuery,
} from "../services/admin.Api";
import { useAppDispatch } from "../../../app/hooks";
import { clearSessionId, clearSession } from "../../session/services/sessionSlice";
import QuestionEditorDialog from "../components/QuestionEditorDialog";
import QuestionLibraryManager from "../components/QuestionLibraryManager";
import { Box, CircularProgress, Typography, Paper, Button } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import BlockIcon from "@mui/icons-material/Block";

const GlobalQuestionLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  
  const [editingQuestion, setEditingQuestion] =
    useState<QuestionBankItem | null>(null);

  // Authenticate Passcode
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const passcode = queryParams.get("passcode");
    
    if (passcode) {
      const authWithPasscode = async () => {
        setVerifyingPasscode(true);
        setPasscodeError(null);
        // Clear any residual session to ensure global requests don't use old x-session-id headers
        dispatch(clearSessionId());
        dispatch(clearSession());
        try {
          const res = await fetch(
            `${import.meta.env.VITE_BACKEND_BASE_URL}/admin/authenticate-library-passcode`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({ passcode }),
            }
          );
          const data = await res.json();
          if (res.ok && data.success) {
            navigate("/admin/questions", { replace: true });
          } else {
            setPasscodeError(data.error || data.message || "Authentication failed");
          }
        } catch (err: any) {
          setPasscodeError(err.message || "Failed to authenticate passcode");
        } finally {
          setVerifyingPasscode(false);
        }
      };
      authWithPasscode();
    }
  }, [location.search, navigate]);

  const { data: foldersResponse, error: foldersError } = useFetchQuestionFoldersQuery(undefined, {
    skip: verifyingPasscode || !!passcodeError || new URLSearchParams(location.search).has("passcode"),
  });

  const folders = useMemo(() => {
    const apiFolders = foldersResponse?.data?.folders || [];
    return ["General", ...apiFolders.filter((folder: string) => folder !== "General")];
  }, [foldersResponse]);

  if (verifyingPasscode) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc" }}>
        <CircularProgress size={40} sx={{ color: "#f97316", mb: 2 }} />
        <Typography variant="body1" sx={{ color: "#475569", fontWeight: 500 }}>
          Authenticating Super Admin passcode...
        </Typography>
      </Box>
    );
  }

  if (passcodeError) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", p: 3 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #fee2e2", maxWidth: 440, width: "100%", textAlign: "center" }}>
          <LockIcon sx={{ fontSize: 48, color: "#991b1b", mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#991b1b", mb: 1 }}>
            Access Denied
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 3, lineHeight: 1.5 }}>
            {passcodeError}
          </Typography>
          <Button
            fullWidth
            variant="contained"
            sx={{ bgcolor: "#f97316", "&:hover": { bgcolor: "#ea580c" } }}
            onClick={() => {
              setPasscodeError(null);
              navigate("/admin/questions", { replace: true });
            }}
          >
            Go Back
          </Button>
        </Paper>
      </Box>
    );
  }

  if (foldersError) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", p: 3 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #fee2e2", maxWidth: 440, width: "100%", textAlign: "center" }}>
          <BlockIcon sx={{ fontSize: 48, color: "#991b1b", mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#991b1b", mb: 1 }}>
            Unauthorized
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 3, lineHeight: 1.5 }}>
            You do not have permission to access the Question Library. Please authenticate via the Super Admin panel.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <>
      {/* 
        We pass empty arrays/undefined to session-specific props
        to indicate we are not bound to any session. 
      */}
      <QuestionLibraryManager
        showBackButton={false}
        showCurrentListButton={false}
        showSaveButton={false}
        selectedQuestionIds={[]}
      />

      {/* Editor dialog works independently of sessions */}
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

export default GlobalQuestionLibraryPage;
