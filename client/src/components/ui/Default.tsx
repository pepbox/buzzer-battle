import React from "react";
import { Box, Typography, Container, Paper } from "@mui/material";

const Default: React.FC = () => {
  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#f5f6fa"
    >
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h3" component="h1" gutterBottom color="primary">
            Welcome to <span style={{ color: "primary.main" }}>GETSETKNOW</span>
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please obtain the correct link from your admin to start playing.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Default;
