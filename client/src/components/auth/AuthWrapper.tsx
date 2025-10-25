import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface AuthWrapperProps {
  userType: "team" | "admin";
  redirection: string;
}

const AuthWrapper = ({ userType, redirection }: AuthWrapperProps) => {
  const isAuthenticated = useSelector((state: RootState) =>
    userType === "team"
      ? state.team.isAuthenticated
      : state.admin.isAuthenticated
  );

  if (!isAuthenticated) {
    console.log("not authenticaated....")
    return <Navigate to={redirection} />;
  }

  return <Outlet />;
};

export default AuthWrapper;
