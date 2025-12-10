import { Component, ComponentFactoryResolver, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { NgForm } from "@angular/forms";
import { Store } from "@ngrx/store";
import { Subscription } from "rxjs";
import { AlertComponent } from "../shared/alert/alert.component";
import { PlaceHolderDirective } from "../shared/placeholder/placeholder.directive";
import * as fromApp from '../store/app.reducer'
import * as AuthActions from './store/auth.actions'

@Component({
  standalone: false,
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})

export class AuthComponent implements OnInit, OnDestroy {
  isLoginMode = true
  isLoading = false
  error: string = null
  successMessage: string = null
  showForgotPassword = false
  @ViewChild(PlaceHolderDirective, { static: false }) alertHost: PlaceHolderDirective
  private closeSub: Subscription
  private storeSub: Subscription

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private store: Store<fromApp.AppState>
  ) {
  }

  ngOnInit() {
    this.storeSub = this.store
      .select('auth')
      .subscribe(authState => {
        this.isLoading = authState.loading
        this.error = authState.authError
        this.successMessage = authState.successMessage
        if (this.error) {
          this.showErrorAlert(this.error)
        }
      })
  }

  onSubmit(authForm: NgForm) {
    if (!authForm.valid) {
      return
    }

    const username = authForm.value.username
    const password = authForm.value.password

    this.store.dispatch(new AuthActions.LoginStart({
      username: username,
      password: password,
    }))
  }

  onForgotPassword() {
    this.showForgotPassword = true
    this.store.dispatch(new AuthActions.ClearError())
  }

  onBackToLogin() {
    this.showForgotPassword = false
    this.store.dispatch(new AuthActions.ClearError())
  }

  onSubmitForgotPassword(forgotForm: NgForm) {
    if (!forgotForm.valid) {
      return
    }
    const email = forgotForm.value.email
    this.store.dispatch(new AuthActions.ForgotPasswordStart({ email }))
  }

  onHandleError() {
    this.store.dispatch(new AuthActions.ClearError())
  }

  private showErrorAlert(message: string) {
    const alertComponentFactory = this.componentFactoryResolver.resolveComponentFactory(AlertComponent)
    const hostViewContainerRef = this.alertHost.viewContainerRef
    hostViewContainerRef.clear()

    const componentRef = hostViewContainerRef.createComponent(alertComponentFactory)

    componentRef.instance.message = message
    this.closeSub = componentRef.instance.close.subscribe(() => {
      this.closeSub.unsubscribe()
      hostViewContainerRef.clear()
    })
  }

  ngOnDestroy() {
    if (this.closeSub) {
      this.closeSub.unsubscribe()
    }
    if (this.storeSub) {
      this.storeSub.unsubscribe()
    }
  }
}
