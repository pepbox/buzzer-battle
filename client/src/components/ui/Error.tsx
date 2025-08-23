import { Box, Typography } from '@mui/material'
import React from 'react'

const ErrorLayout : React.FC = () => {
  return (
    <Box
        sx={{
          bgcolor: "#1e1e1e",
          p: 3,
          borderRadius: 2,
          textAlign: "center",
          color: "#ffffff",
        }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Data Not Available.
        </Typography>
      </Box>
  )
}

export default ErrorLayout