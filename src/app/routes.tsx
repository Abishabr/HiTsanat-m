import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import RoleRouter from "./pages/RoleRouter";
import ChildrenManagement from "./pages/ChildrenManagement";
import MemberManagement from "./pages/MemberManagement";
import WeeklyPrograms from "./pages/WeeklyPrograms";
import EventsManagement from "./pages/EventsManagement";
import MemberActivities from "./pages/MemberActivities";
import TimhertAcademic from "./pages/TimhertAcademic";
import AttendanceTracking from "./pages/AttendanceTracking";
import Reports from "./pages/Reports";
import SubDepartmentDashboard from "./pages/SubDepartmentDashboard";
import NotFound from "./pages/NotFound";
import MemberRegistrationForm from "./pages/MemberRegistrationForm";
import ChildrenRegistrationForm from "./pages/ChildrenRegistrationForm";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, Component: RoleRouter },
      { path: "children", Component: ChildrenManagement },
      { path: "members", Component: MemberManagement },
      { path: "weekly-programs", Component: WeeklyPrograms },
      { path: "events", Component: EventsManagement },
      { path: "member-activities", Component: MemberActivities },
      { path: "timhert", Component: TimhertAcademic },
      { path: "attendance", Component: AttendanceTracking },
      { path: "reports", Component: Reports },
      { path: "subdepartment/:id", Component: SubDepartmentDashboard },
      { path: "register/member", Component: MemberRegistrationForm },
      { path: "register/child", Component: ChildrenRegistrationForm },
      { path: "*", Component: NotFound },
    ],
  },
]);
