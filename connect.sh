source ./load-env.sh

select user in "John Admin" "John User" "Terry Admin" "Terry User" "Allen Anonymous"
do 
  case $user in
    "John Admin")
        token=$JOHN_ADMIN
        break;;
    "John User")
        token=$JOHN_USER
        break;;
    "Terry Admin")
        token=$TERRY_ADMIN
        break;;
    "Terry User")
        token=$TERRY_USER
        break;;
    "Allen Anonymous")
        token=$ALLEN_ANON
        break;;
    *)
        echo "Invalid";;
  esac
done

wscat -c $WSS_URL?access_token=$token
# wscat -c $WSS_URL