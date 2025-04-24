
import { EmojiProvider, Emoji } from "react-apple-emojis"
import emojiData from "react-apple-emojis/src/data.json"
import '../styles/components/ProjectAndDashboardCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";

function ProjectAndDashboardCard({ onClick }) {
    return (

        <div id='project-card-container'

             onClick={onClick}
        >

            <div id='project-card-icon-row-container'>
                <div id='project-card-icon-container'>
                    <EmojiProvider data={emojiData}>
                        <Emoji name="teacher-light-skin-tone" width={22}/>
                    </EmojiProvider>
                </div>

                <div >
                    <img src={OptionsPassive} alt="Options Active"/>
                </div>

            </div>
            <div id='project-card-text-container'>

                <div id='project-card-text-header'>
                    Уроки дизайна
                </div>
                <div id='project-card-text-descr'>
                    Разработать веб-сайт для школы дизайна.
                </div>

            </div>
            <div id='project-card-progress-container'>

                <div id='project-card-progress-bar'>

                </div>

                <div id='project-card-progress-text'>
                    13% завершено
                </div>

            </div>

        </div>

    );
}

export default ProjectAndDashboardCard;
