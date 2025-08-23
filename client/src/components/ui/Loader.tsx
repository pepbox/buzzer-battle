import { CircularProgress, Stack } from "@mui/material"

const Loader = () => {
  return (
    <Stack justifyContent={"center"} alignItems={"center"} minHeight={window.innerHeight}><CircularProgress/></Stack>
  )
}

export default Loader