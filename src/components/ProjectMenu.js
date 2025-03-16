
import '../styles/components/ProjectMenu.css'
import OptionsActive from '../assets/icons/options_active.svg'
import OptionsPassive from '../assets/icons/options_passive.svg'
import { EmojiProvider, Emoji } from "react-apple-emojis"
import emojiData from "react-apple-emojis/src/data.json"
import Man from "../assets/icons/man.svg"
import Man2 from "../assets/icons/man2.svg"
import Girl from "../assets/icons/girl.svg"

function ProjectMenu() {
    return (

        <div id='project-menu-container'>

            <div id='project-menu-project-list-container'>

                <div id='project-menu-project-list-label'>Проекты</div>

                <div id='project-menu-project-list'>

                    <div id='project-menu-project-list-item-active'>

                        <div id='project-menu-project-list-item-label-group'>
                            <div id='project-menu-project-list-item-label-group-icon'>
                                <EmojiProvider data={emojiData}>
                                    <Emoji name="teacher-light-skin-tone" width={12}/>
                                </EmojiProvider>
                            </div>
                            <div id='project-menu-project-list-item-label-group-label'>Курсы языков</div>
                        </div>
                        <div id='project-menu-project-list-item-options'>
                            <img src={OptionsActive} alt="Options Active"/>
                        </div>

                    </div>

                    <div id='project-menu-project-list-item-passive'>

                        <div id='project-menu-project-list-item-label-group'>
                            <div id='project-menu-project-list-item-label-group-icon-passive'>
                                <EmojiProvider data={emojiData}>
                                    <Emoji name="teacher-light-skin-tone" width={12}/>
                                </EmojiProvider>
                            </div>
                            <div id='project-menu-project-list-item-label-group-label-passive'>Курсы языков</div>
                        </div>
                        <div id='project-menu-project-list-item-options'>
                            <img src={OptionsPassive} alt="Options Active"/>
                        </div>

                    </div>


                    <div id='project-menu-project-list-item-passive'>

                        <div id='project-menu-project-list-item-label-group'>
                            <div id='project-menu-project-list-item-label-group-icon-passive'>
                                <EmojiProvider data={emojiData}>
                                    <Emoji name="teacher-light-skin-tone" width={12}/>
                                </EmojiProvider>
                            </div>
                            <div id='project-menu-project-list-item-label-group-label-passive'>Курсы языков</div>
                        </div>
                        <div id='project-menu-project-list-item-options'>
                            <img src={OptionsPassive} alt="Options Active"/>
                        </div>

                    </div>

                    <div id='project-menu-project-list-item-passive'>

                        <div id='project-menu-project-list-item-label-group'>
                            <div id='project-menu-project-list-item-label-group-icon-passive'>
                                <EmojiProvider data={emojiData}>
                                    <Emoji name="teacher-light-skin-tone" width={12}/>
                                </EmojiProvider>
                            </div>
                            <div id='project-menu-project-list-item-label-group-label-passive'>Курсы языков</div>
                        </div>
                        <div id='project-menu-project-list-item-options'>
                            <img src={OptionsPassive} alt="Options Active"/>
                        </div>

                    </div>


                </div>

            </div>

            <div id='project-menu-people-list-container'>

                <div id='project-menu-people-list-label'>Участники</div>

                <div id='project-menu-people-list'>

                    <div id='project-menu-people-list-item'>

                        <div id='project-menu-people-list-item-label-group'>
                            <div id='project-menu-people-list-item-label-group-icon'>
                                <img src={Girl}/>
                            </div>
                            <div id='project-menu-people-list-item-label-group-label-container'>

                                <div id='project-menu-people-list-item-label-group-label-username'>
                                    Малькова Александра
                                </div>
                                <div id='project-menu-people-list-item-label-group-label-status-container'>
                                    <div id='project-menu-people-list-item-label-group-label-status-color-active'></div>
                                    <div id='project-menu-people-list-item-label-group-label-status-text'>Онлайн</div>
                                </div>
                            </div>
                        </div>

                        <div id='project-menu-people-list-item-options'>
                            <img src={OptionsPassive} alt="Options Active"/>
                        </div>


                    </div>
                    <div id='project-menu-people-list-item'>

                        <div id='project-menu-people-list-item-label-group'>
                            <div id='project-menu-people-list-item-label-group-icon'>
                                <img src={Girl}/>
                            </div>
                            <div id='project-menu-people-list-item-label-group-label-container'>

                                <div id='project-menu-people-list-item-label-group-label-username'>
                                    Малькова Александра
                                </div>
                                <div id='project-menu-people-list-item-label-group-label-status-container'>
                                    <div id='project-menu-people-list-item-label-group-label-status-color-active'></div>
                                    <div id='project-menu-people-list-item-label-group-label-status-text'>Онлайн</div>
                                </div>
                            </div>
                        </div>

                        <div id='project-menu-people-list-item-options'>
                            <img src={OptionsPassive} alt="Options Active"/>
                        </div>


                    </div>
                    <div id='project-menu-people-list-item'>

                        <div id='project-menu-people-list-item-label-group'>
                            <div id='project-menu-people-list-item-label-group-icon'>
                                <img src={Girl}/>
                            </div>
                            <div id='project-menu-people-list-item-label-group-label-container'>

                                <div id='project-menu-people-list-item-label-group-label-username'>
                                    Малькова Александра
                                </div>
                                <div id='project-menu-people-list-item-label-group-label-status-container'>
                                    <div id='project-menu-people-list-item-label-group-label-status-color-active'></div>
                                    <div id='project-menu-people-list-item-label-group-label-status-text'>Онлайн</div>
                                </div>
                            </div>
                        </div>

                        <div id='project-menu-people-list-item-options'>
                            <img src={OptionsPassive} alt="Options Active"/>
                        </div>


                    </div>
                    <div id='project-menu-people-list-item'>

                        <div id='project-menu-people-list-item-label-group'>
                            <div id='project-menu-people-list-item-label-group-icon'>
                                <img src={Girl}/>
                            </div>
                            <div id='project-menu-people-list-item-label-group-label-container'>

                                <div id='project-menu-people-list-item-label-group-label-username'>
                                    Малькова Александра
                                </div>
                                <div id='project-menu-people-list-item-label-group-label-status-container'>
                                    <div id='project-menu-people-list-item-label-group-label-status-color-active'></div>
                                    <div id='project-menu-people-list-item-label-group-label-status-text'>Онлайн</div>
                                </div>
                            </div>
                        </div>

                        <div id='project-menu-people-list-item-options'>
                            <img src={OptionsPassive} alt="Options Active"/>
                        </div>


                    </div>

                </div>

            </div>

            <div id='project-menu-events-container'>

                <div id='project-menu-events-label'>События</div>

                <div id='project-menu-events-window'>

                    <div id='project-menu-events-window-all'>Всего</div>

                    <div id='project-menu-events-window-events'>
                        <div id='project-menu-events-window-events-counter'>1087 событий</div>
                        <div id='project-menu-people-list-item-options'>
                            <img src={OptionsPassive} alt="Options Active"/>
                        </div>
                    </div>

                    <div id='project-menu-events-window-events-added'>
                        <div id='project-menu-events-window-events-added-text'>+25</div>
                        <div id='project-menu-events-window-events-added-label'>новых событий</div>
                    </div>

                </div>

            </div>

            <div id='project-menu-add-project-button'>
                    <div id='project-menu-add-project-button-text'>+ Добавить проект</div>
            </div>

        </div>
    );
}

export default ProjectMenu;
