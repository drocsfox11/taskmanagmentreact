import LeftMenu from "../components/LeftMenu";
import {Outlet} from "react-router-dom";
import NotificationsContainer from "../components/NotificationSystem";

function ContentContainer() {
    console.log('ContentContainer');

    return (
       <div style={{ display: 'flex', flexDirection: 'row',width: '100%',height: '100%',overflow: 'hidden' }}>
           <LeftMenu></LeftMenu>
           <Outlet></Outlet>
           <NotificationsContainer />
       </div>
    );
}

export default ContentContainer;
