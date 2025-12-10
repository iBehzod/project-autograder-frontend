import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import * as fromApp from '../store/app.reducer';

@Component({
    standalone: false,
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
    username: string = '';
    role: string = '';
    isAdmin = false;
    isLecturer = false;
    isStudent = false;
    private userSub: Subscription;

    constructor(private store: Store<fromApp.AppState>) { }

    ngOnInit() {
        this.userSub = this.store.select('auth')
            .pipe(map(authState => authState.user))
            .subscribe(user => {
                if (user) {
                    this.username = user.username;
                    this.role = user.role;
                    this.isAdmin = user.role === 'ADMIN';
                    this.isLecturer = user.role === 'LECTURER';
                    this.isStudent = user.role === 'STUDENT';
                }
            });
    }

    ngOnDestroy() {
        if (this.userSub) {
            this.userSub.unsubscribe();
        }
    }
}
