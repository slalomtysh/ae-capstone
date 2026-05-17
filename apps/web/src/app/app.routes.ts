import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { TeamSelectionPageComponent } from './pages/team-selection/team-selection-page.component';
import { GameViewPageComponent } from './pages/game-view/game-view-page.component';

export const routes: Routes = [
	{ path: '', component: HomePageComponent },
	{ path: 'teams', component: TeamSelectionPageComponent },
	{ path: 'games/:sport/:eventId', component: GameViewPageComponent },
	{ path: '**', redirectTo: '' }
];
