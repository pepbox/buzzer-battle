import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Paper,
} from "@mui/material";
import { SelfieData } from "../types/interfaces";

interface SelfiesGalleryProps {
  selfies: SelfieData[];
}

const SelfiesGallery: React.FC<SelfiesGalleryProps> = ({ selfies }) => {
  if (selfies.length === 0) {
    return (
      <Box>
        <Typography
          variant="h5"
          fontWeight="bold"
          mb={3}
          textAlign="center"
          color="primary"
        >
          Guess Selfies
        </Typography>
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "rgba(0, 0, 0, 0.05)",
          }}
        >
          <Typography variant="body1" color="text.secondary">
            No selfies uploaded yet. Players will see their selfies here once
            they make correct guesses!
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
            <Typography
        variant="h5"
        fontWeight="bold"
        mb={3}
        textAlign="center"
        color="primary"
      >
        📸 Photo Gallery
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
            xl: "repeat(4, 1fr)",
          },
          gap: {
            xs: 1.5,
            sm: 2,
            md: 2.5,
          },
        }}
      >
        {selfies.map((selfie) => (
          <Card
            key={selfie.id}
            sx={{
              borderRadius: "12px",
              transition: "transform 0.2s ease-in-out",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
              },
            }}
          >
            <CardMedia
              component="img"
              height="180"
              image={
                selfie.selfieId ? selfie.selfieId : "/placeholder-selfie.jpg"
              }
              alt={`${selfie.guesserName} guessed ${selfie.guessedPersonName}`}
              sx={{
                objectFit: "cover",
                backgroundColor: "#f5f5f5",
                height: {
                  xs: "150px",
                  sm: "170px",
                  md: "180px",
                },
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder-selfie.jpg";
              }}
            />
            <CardContent sx={{ p: 2, textAlign: "center" }}>
              {/* Simple player names display */}
              <Box
                sx={{
                  // backgroundColor: "#fff",
                  // borderRadius: "8px",
                  // p: 1.5,
                  // border: "1px solid #e0e0e0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {/* First player name */}
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "0.875rem",
                    color: "#333",
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  {selfie.guesserName}
                </Typography>
                
                {/* Horizontal divider line */}
                <Box
                  sx={{
                    width: "100%",
                    height: "1px",
                    backgroundColor: "#e0e0e0",
                    my: 1,
                  }}
                />
                
                {/* Second player name */}
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "0.875rem",
                    color: "#666",
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  {selfie.guessedPersonName}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default SelfiesGallery;
