import { Box, IconButton, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

interface GameHeaderProps {
  title?: string;
}

const GameHeader: React.FC<GameHeaderProps> = ({ title = "GetSetKnow!" }) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: 2,
        pt: 3,
        color: "black",
      }}
    >
      <IconButton onClick={() => navigate(-1)} sx={{ p: 0.5 }}>
        <ArrowBack />
      </IconButton>
      <Typography
        variant="h6"
        textAlign="center"
        sx={{
          mx: "auto",
          fontWeight: "bold",
          fontSize: "18px",
        }}
      >
        {title}
      </Typography>
    </Box>
  );
};

export default GameHeader;
