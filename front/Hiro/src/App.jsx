import { Outlet, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Provider } from 'react-redux';
import { store } from "./redux/store";
import { Footer, Navbar } from "./components";
import 
{
  About,
  AuthPage,
  Companies,
  CvMatch,
  Chat,
  Applicants,
  CompanyProfile,
  FindJobs,
  JobDetail,
  UploadJob,
  UserProfile,
  OTPInput,
} from "./pages";
import { useSelector } from "react-redux";

function Layout()
{
  const { user } = useSelector((state) => state.user);
  const location = useLocation();

  return user?.token ? (
    <Outlet />
  ) : (
    <Navigate to='/user-auth' state={{ from: location }} replace />
  );
}

function App()
{
  const { user } = useSelector((state) => state.user);
  const location = useLocation();

  // Check if the current route is "/chat"
  const isChatPage = location.pathname === "/chat";

  return (
    <main className='bg-[#f7fdfd]'>
      {/* Conditionally render Navbar if not on the Chat page */}
      {!isChatPage && <Navbar />}

      <Routes>
        <Route element={<Layout />}>
          <Route
            path='/'
            element={user?.accountType === "seeker" ? <Navigate to='/find-jobs' replace={true} /> : <Navigate to='/applicants' replace={true} />}
          />
          <Route path='/find-jobs' element={<FindJobs />} />
          <Route path='/companies' element={<Companies />} />
          <Route path='/cv-analyser' element={<CvMatch />} />
          <Route path='/chat' element={<Chat />} />

          <Route path='/otp' element={<OTPInput />} />
          <Route
            path={
              user?.accountType === "seeker"
                ? "/user-profile"
                : "/user-profile/:id"
            }
            element={<UserProfile />}
          />

          <Route path={"/company-profile"} element={<CompanyProfile />} />
          <Route path={"/company-profile/:id"} element={<CompanyProfile />} />
          <Route path={"/applicants"} element={<Applicants />} />
          <Route path={"/upload-job"} element={<UploadJob />} />
          <Route path={"/job-detail/:id"} element={<JobDetail />} />
        </Route>

        <Route path='/about-us' element={<About />} />
        <Route path='/user-auth' element={<AuthPage />} />
      </Routes>

      {/* Conditionally render Footer if not on the Chat page */}
      {!isChatPage && user && <Footer />}
    </main>
  );
}

export default App;
