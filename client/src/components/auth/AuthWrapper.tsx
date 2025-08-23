import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface AuthWrapperProps {
  userType: "player" | "admin";
  redirection: string;
}

const AuthWrapper = ({ userType, redirection }: AuthWrapperProps) => {
  const isAuthenticated = useSelector((state: RootState) =>
    userType === "player"
      ? state.player.isAuthenticated
      : state.admin.isAuthenticated
  );

  if (!isAuthenticated) {
    return <Navigate to={redirection} />;
  }

  return <Outlet />;
};

export default AuthWrapper;
