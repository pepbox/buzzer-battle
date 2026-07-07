import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Snackbar,
  Alert
} from "@mui/material";
import {
  useUpdateSessionMutation,
  useUploadSessionLogoMutation,
} from "../../session/services/session.api";

interface SessionBrandingModalProps {
  open: boolean;
  onClose: () => void;
  initialCompanyName?: string;
  initialCompanyLogo?: string;
}

const SessionBrandingModal: React.FC<SessionBrandingModalProps> = ({
  open,
  onClose,
  initialCompanyName = "",
  initialCompanyLogo = "",
}) => {
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(initialCompanyLogo);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [updateSession, { isLoading: isUpdating }] = useUpdateSessionMutation();
  const [uploadLogo, { isLoading: isUploading }] = useUploadSessionLogoMutation();

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });

  useEffect(() => {
    if (open) {
      setCompanyName(initialCompanyName || "");
      setCompanyLogoUrl(initialCompanyLogo || "");
      setSelectedFile(null);
      setPreviewUrl("");
    }
  }, [open, initialCompanyName, initialCompanyLogo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please upload a valid image file.", severity: "error" });
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setSnackbar({ open: true, message: "File size exceeds 5MB limit.", severity: "error" });
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      let finalLogoUrl = companyLogoUrl;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("logo", selectedFile);
        
        const response = await uploadLogo(formData).unwrap();
        if (response.success && response.data.fileUrl) {
          finalLogoUrl = response.data.fileUrl;
        }
      }

      await updateSession({
        companyName,
        companyLogo: finalLogoUrl
      }).unwrap();

      setSnackbar({ open: true, message: "Branding updated successfully!", severity: "success" });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Failed to update branding:", error);
      setSnackbar({ open: true, message: "Failed to update session branding.", severity: "error" });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Session Branding Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
            <TextField
              label="Company / Sponsor Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              fullWidth
            />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Company Logo
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Button variant="outlined" component="label">
                  Upload Logo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </Button>
                {selectedFile && <Typography variant="body2">{selectedFile.name}</Typography>}
              </Box>
              
              {/* Logo Preview */}
              {(previewUrl || companyLogoUrl) && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Preview:</Typography>
                  <Box
                    component="img"
                    src={previewUrl || companyLogoUrl}
                    alt="Company Logo Preview"
                    sx={{ maxHeight: 100, maxWidth: "100%", objectFit: "contain", display: "block", mt: 1, borderRadius: 1, border: "1px solid #ddd", p: 1 }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isUpdating || isUploading}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            color="primary"
            disabled={isUpdating || isUploading}
          >
            {(isUpdating || isUploading) ? <CircularProgress size={24} /> : "Save Branding"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SessionBrandingModal;
