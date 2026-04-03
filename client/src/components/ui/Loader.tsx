import { CircularProgress, Stack } from "@mui/material"

const Loader = () => {
  return (
    <Stack
      justifyContent={"center"}
      alignItems={"center"}
      sx={{ width: "100%", flex: 1, minHeight: "100%" }}
    >
      <CircularProgress />
    </Stack>
  )
}

export default Loader
