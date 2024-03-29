import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Router } from '@angular/router';

import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import firebase from 'firebase/app';

import { RegisterForm } from 'src/app/public/register/register.model';
import { SnackbarService } from './snackbar.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public user$: Observable<User | null | undefined>;
  public user: firebase.User | null = null;

  constructor(
    private auth: AngularFireAuth,
    private afs: AngularFirestore,
    private router: Router,
    private snackbar: SnackbarService
  ) {
    this.user$ = this.auth.authState.pipe(
      switchMap((user) => {
        if (!!user) {
          this.user = user;
          return this.afs.doc<User>(`users/${user.uid}`).valueChanges();
        } else {
          this.user = null;
          return of(null);
        }
      })
    );
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      await this.auth.signInWithEmailAndPassword(email, password);
      this.router.navigate(['dashboard']);
    } catch (err) {
      if (!!err.message) {
        this.snackbar.open(err.message);
      }
      console.log(err);
    }
  }

  async signUp({ username, email, password }: RegisterForm): Promise<void> {
    try {
      const cred = await this.auth.createUserWithEmailAndPassword(email, password);

      if (!!cred.user) {
        await this.afs.doc(`users/${cred.user.uid}`).set({
          uid: cred.user.uid,
          displayName: username,
          email,
        });
      }

      this.router.navigate(['login']);
    } catch (err) {
      if (!!err.message) {
        this.snackbar.open(err.message);
      }
      console.log(err);
    }
  }

  async googleSignIn(): Promise<Promise<void> | void> {
    const provider = new firebase.auth.GoogleAuthProvider();
    const cred = await this.auth.signInWithPopup(provider);

    if (!!cred.user) {
      let { displayName, email, photoURL } = cred.user;
      displayName = displayName || 'Unknown';
      email = email || '';
      photoURL = photoURL || '';
      const user: User = {
        uid: cred.user.uid,
        displayName,
        email,
        photoURL,
      };
      this.router.navigate(['dashboard']);
      return this.updateUserData(user);
    }
  }

  async signOut(): Promise<Promise<boolean>> {
    await this.auth.signOut();
    return this.router.navigate(['login']);
  }

  private updateUserData({ uid, email, displayName, photoURL }: User): Promise<void> {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(`users/${uid}`);

    const data = { uid, email, displayName, photoURL };

    return userRef.set(data, { merge: true });
  }
}
