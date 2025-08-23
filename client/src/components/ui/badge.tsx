import React from "react";
import { Box, Typography, useTheme } from "@mui/material";

type BadgeProps = {
  title: string;
  image: string;
  progress: number;
};

const Badge: React.FC<BadgeProps> = ({ title, image, progress }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        bgcolor: theme.palette.primary.main,
        color: "black",
        flex: "1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-around",
        p: "20px 15px ",
      }}
    >
      <Typography
        fontSize={"10px"}
        fontWeight="700"
        textAlign="center"
        color="rgba(54, 54, 54, 1)"
        sx={{textWrap:"nowrap"}}
      >
        {title}
      </Typography>

      <Box
        component="img"
        src={image}
        alt={title}
        mt={2}
        sx={{ width: 68, height: 95 }}
      />

      <Typography  fontSize={"7px"} fontWeight="600" mt={2}>
        {progress == 100 ? "Completed" : "Next"} {progress}%
      </Typography>

      <Box
        sx={{
          mt: 1,
          width: "100%",
          height: 5,
          backgroundColor: theme.palette.background.paper,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${progress}%`,
            backgroundColor: "black",
            transition: "width 0.3s ease-in-out",
          }}
        />
      </Box>
    </Box>
  );
};

export default Badge;
